export {}; // module scope: these helpers must not collide with scripts/smoke.ts

/**
 * Latency / throughput probe.
 *
 *   npx tsx scripts/load-test.ts --base http://127.0.0.1:3000 --concurrency 25 --seconds 20
 *
 * This is not k6. It exists because the two questions that decide whether a
 * single-Node cPanel deployment survives launch are cheap to answer:
 *
 *   - what are p50/p95/p99 for the pages a customer actually loads, and
 *   - does error rate stay at zero while the event loop is busy?
 *
 * It runs closed-loop (a fixed number of workers issuing back-to-back requests),
 * reports latency percentiles and throughput, and fails on any 5xx or on a p95
 * above the threshold. Real capacity planning still wants k6 or Artillery from
 * outside the box; this is the smoke-level version that runs on the box itself.
 */

interface Result {
  path: string;
  durations: number[];
  errors: number;
  statuses: Map<number, number>;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let base = process.env.LOAD_BASE_URL ?? process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
  let concurrency = 10;
  let seconds = 15;
  let p95BudgetMs = 1500;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--base") base = argv[++i];
    else if (argv[i] === "--concurrency") concurrency = Number.parseInt(argv[++i], 10);
    else if (argv[i] === "--seconds") seconds = Number.parseInt(argv[++i], 10);
    else if (argv[i] === "--budget") p95BudgetMs = Number.parseInt(argv[++i], 10);
  }
  return { base: base.replace(/\/$/, ""), concurrency, seconds, p95BudgetMs };
}

/** Routes weighted roughly by how often a real visitor hits them. */
const TARGETS: Array<{ path: string; weight: number }> = [
  { path: "/", weight: 4 },
  { path: "/courses", weight: 3 },
  { path: "/classes", weight: 2 },
  { path: "/shop", weight: 2 },
  { path: "/blog", weight: 2 },
  { path: "/instructors", weight: 1 },
  { path: "/about", weight: 1 },
  { path: "/api/health", weight: 1 },
];

function weightedTargets(): string[] {
  const list: string[] = [];
  for (const t of TARGETS) for (let i = 0; i < t.weight; i += 1) list.push(t.path);
  return list;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

async function main() {
  const { base, concurrency, seconds, p95BudgetMs } = parseArgs();
  const paths = weightedTargets();
  const deadline = Date.now() + seconds * 1000;
  const results = new Map<string, Result>();
  for (const t of TARGETS) {
    results.set(t.path, { path: t.path, durations: [], errors: 0, statuses: new Map() });
  }

  console.log(`Load probe: ${base} — ${concurrency} workers for ${seconds}s (${paths.length}-way weighted mix)\n`);

  let issued = 0;
  const started = Date.now();

  async function worker() {
    while (Date.now() < deadline) {
      const path = paths[issued % paths.length];
      issued += 1;
      const result = results.get(path)!;
      const at = performance.now();
      try {
        const res = await fetch(`${base}${path}`, {
          signal: AbortSignal.timeout(30_000),
          headers: { "user-agent": "asadzedeh-load-test" },
        });
        await res.arrayBuffer();
        result.durations.push(performance.now() - at);
        result.statuses.set(res.status, (result.statuses.get(res.status) ?? 0) + 1);
        if (res.status >= 500) result.errors += 1;
      } catch {
        result.durations.push(performance.now() - at);
        result.errors += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsed = (Date.now() - started) / 1000;

  const all: number[] = [];
  let totalErrors = 0;
  let totalRequests = 0;

  console.log("path            reqs    errors    p50      p95      p99      max");
  for (const result of results.values()) {
    if (result.durations.length === 0) continue;
    const sorted = [...result.durations].sort((a, b) => a - b);
    all.push(...result.durations);
    totalErrors += result.errors;
    totalRequests += result.durations.length;
    const statuses = [...result.statuses.entries()].map(([k, v]) => `${k}×${v}`).join(" ");
    console.log(
      `${result.path.padEnd(15)} ${String(result.durations.length).padStart(5)} ${String(result.errors).padStart(9)} ` +
        `${`${Math.round(percentile(sorted, 50))}ms`.padStart(8)} ${`${Math.round(percentile(sorted, 95))}ms`.padStart(8)} ` +
        `${`${Math.round(percentile(sorted, 99))}ms`.padStart(8)} ${`${Math.round(sorted[sorted.length - 1])}ms`.padStart(8)}   ${statuses}`,
    );
  }

  const sortedAll = all.sort((a, b) => a - b);
  const p50 = Math.round(percentile(sortedAll, 50));
  const p95 = Math.round(percentile(sortedAll, 95));
  const p99 = Math.round(percentile(sortedAll, 99));
  const rps = Math.round((totalRequests / elapsed) * 10) / 10;

  console.log("");
  console.log(`total      ${totalRequests} requests in ${elapsed.toFixed(1)}s  →  ${rps} req/s`);
  console.log(`latency    p50 ${p50}ms   p95 ${p95}ms   p99 ${p99}ms`);
  console.log(`errors     ${totalErrors} (${totalRequests ? ((totalErrors / totalRequests) * 100).toFixed(2) : "0"}%)`);

  const failed = totalErrors > 0 || p95 > p95BudgetMs;
  console.log("");
  if (failed) {
    if (totalErrors > 0) console.log(`FAIL: ${totalErrors} request(s) errored`);
    if (p95 > p95BudgetMs) console.log(`FAIL: p95 ${p95}ms exceeds the ${p95BudgetMs}ms budget`);
    process.exitCode = 1;
  } else {
    console.log(`LOAD PROBE PASSED — ${totalRequests} requests, p95 ${p95}ms within ${p95BudgetMs}ms, 0 errors`);
  }
}

await main();
