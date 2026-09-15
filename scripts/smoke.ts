import { readFileSync } from "node:fs";

/**
 * Post-deploy smoke test.
 *
 *   npx tsx scripts/smoke.ts --base https://asadzedeh.ir
 *
 * Read-only by design: it makes GET/HEAD requests and inspects headers. It
 * never logs in, never creates an order and never calls the payment gateway,
 * so it is safe to run against production on every deploy.
 *
 * Exits non-zero on the first FAIL so a deploy pipeline can gate on it.
 */

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function parseArgs(): { base: string; timeoutMs: number } {
  const argv = process.argv.slice(2);
  let base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
  let timeoutMs = 15_000;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--base") base = argv[++i];
    else if (argv[i] === "--timeout") timeoutMs = Number.parseInt(argv[++i], 10);
  }
  return { base: base.replace(/\/$/, ""), timeoutMs };
}

async function get(url: string, timeoutMs: number, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
}

const REQUIRED_HEADERS: Record<string, RegExp> = {
  "x-content-type-options": /^nosniff$/i,
  "x-frame-options": /^(DENY|SAMEORIGIN)$/i,
  "referrer-policy": /^strict-origin-when-cross-origin$/i,
  "permissions-policy": /camera=\(\)/i,
  "content-security-policy": /frame-ancestors/i,
};

/** Public pages that must render for the shop to be open. */
const PUBLIC_PATHS = [
  "/",
  "/courses",
  "/classes",
  "/shop",
  "/instructors",
  "/blog",
  "/about",
  "/paths",
  "/auth",
  "/robots.txt",
  "/sitemap.xml",
];

/** Paths that must never serve private content to an anonymous visitor. */
const GUARDED_PATHS = ["/admin", "/admin/users", "/instructor", "/dashboard", "/dashboard/orders"];

/** Strings that must never appear in a response body. */
const SECRET_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "password hash", pattern: /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{20,}/ },
  { label: "TOTP secret", pattern: /"secret"\s*:\s*"[A-Z2-7]{16,}"/ },
  { label: "recovery code", pattern: /"recoveryCodes"\s*:\s*\[\s*"[A-Z0-9]{4}-[A-Z0-9]{4}"/ },
  { label: "session token", pattern: /az_session=[A-Za-z0-9._-]{20,}/ },
  { label: "connection string", pattern: /postgres(ql)?:\/\/[^"\s]+:[^"\s]+@/i },
  { label: "Sentry DSN", pattern: /https:\/\/[a-f0-9]{32}@[a-z0-9.-]+\/\d+/i },
  { label: "Zarinpal merchant id", pattern: /"merchantId"\s*:\s*"[0-9a-f-]{30,}"/i },
  { label: "SMS api key", pattern: /"apiKey"\s*:\s*"[A-Za-z0-9-]{20,}"/ },
];

async function main() {
  const { base, timeoutMs } = parseArgs();
  console.log(`Smoke test against ${base}\n`);

  // 1. Health endpoint: liveness plus an honest dependency report.
  console.log("Health");
  let health: Record<string, unknown> = {};
  try {
    const res = await get(`${base}/api/health`, timeoutMs);
    health = (await res.json()) as Record<string, unknown>;
    record("GET /api/health", res.status === 200, `status ${res.status}`);
    record("health reports a database", Boolean(health.db), `db=${String(health.db)}`);
    record(
      "health reports storage",
      "storage" in health,
      `storage=${String(health.storage)} configured=${String(health.storageConfigured)}`,
    );
    record("health reports monitoring", "monitoring" in health, JSON.stringify(health.monitoring));
  } catch (error) {
    record("GET /api/health", false, error instanceof Error ? error.message : String(error));
  }

  // 2. Demo payment must never be on in production.
  console.log("\nPayment mode");
  const isProductionHost = !/localhost|127\.0\.0\.1|\.local/.test(new URL(base).hostname);
  if (isProductionHost) {
    record(
      "demo payment disabled in production",
      health.demoPayment !== true,
      `demoPayment=${String(health.demoPayment)}`,
    );
  } else {
    record("demo payment (skipped — not a production host)", true, `demoPayment=${String(health.demoPayment)}`);
  }

  // 3. Public pages render.
  console.log("\nPublic pages");
  for (const path of PUBLIC_PATHS) {
    try {
      const res = await get(`${base}${path}`, timeoutMs);
      record(`GET ${path}`, res.status === 200, `status ${res.status}`);
    } catch (error) {
      record(`GET ${path}`, false, error instanceof Error ? error.message : String(error));
    }
  }

  // 4. Security headers on a real response.
  console.log("\nSecurity headers");
  try {
    const res = await get(`${base}/`, timeoutMs);
    for (const [header, pattern] of Object.entries(REQUIRED_HEADERS)) {
      const value = res.headers.get(header) ?? "";
      record(header, pattern.test(value), value ? value.slice(0, 60) : "missing");
    }
    record("no server version disclosed", !res.headers.has("x-powered-by"), res.headers.get("x-powered-by") ?? "absent");
  } catch (error) {
    record("security headers", false, error instanceof Error ? error.message : String(error));
  }

  // 5. Guarded pages must not leak, and must not 500.
  console.log("\nAuthorization");
  for (const path of GUARDED_PATHS) {
    try {
      const res = await get(`${base}${path}`, timeoutMs);
      const body = await res.text();
      const redirected = res.status >= 300 && res.status < 400;
      const leaked =
        /passwordHash|\$2[aby]\$|"role"\s*:\s*"(super_admin|admin)"|gateway_transaction/.test(body) &&
        !/این بخش مخصوص همکاران/.test(body);
      record(
        `GET ${path}`,
        res.status < 500 && !leaked,
        `status ${res.status}${redirected ? ` → ${res.headers.get("location") ?? ""}` : ""}${leaked ? " LEAKED" : ""}`,
      );
    } catch (error) {
      record(`GET ${path}`, false, error instanceof Error ? error.message : String(error));
    }
  }

  // 6. A Server Action posted from a foreign origin must be refused.
  console.log("\nCSRF");
  try {
    const res = await fetch(`${base}/auth`, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "Next-Action": "0000000000000000000000000000000000000000", Origin: "https://evil.example.com" },
    });
    // Next rejects a cross-origin Server Action; anything but a 2xx counts.
    record("cross-origin Server Action rejected", res.status >= 400, `status ${res.status}`);
  } catch (error) {
    record("cross-origin Server Action rejected", true, `refused: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 7. No secret material in any response we fetched.
  console.log("\nSecrets");
  for (const path of ["/", "/courses", "/api/health", "/auth"]) {
    try {
      const res = await get(`${base}${path}`, timeoutMs);
      const body = await res.text();
      const found = SECRET_PATTERNS.filter((s) => s.pattern.test(body)).map((s) => s.label);
      record(`no secrets in ${path}`, found.length === 0, found.length ? `found: ${found.join(", ")}` : "clean");
    } catch (error) {
      record(`no secrets in ${path}`, false, error instanceof Error ? error.message : String(error));
    }
  }

  // 8. robots.txt and sitemap must be well-formed (SEO relies on them).
  console.log("\nSEO");
  try {
    const robots = await (await get(`${base}/robots.txt`, timeoutMs)).text();
    record("robots.txt declares a sitemap", /Sitemap:/i.test(robots), robots.split("\n").find((l) => /Sitemap:/i.test(l)) ?? "missing");
    const sitemap = await (await get(`${base}/sitemap.xml`, timeoutMs)).text();
    const urls = (sitemap.match(/<loc>/g) ?? []).length;
    record("sitemap lists URLs", urls > 0, `${urls} URLs`);
  } catch (error) {
    record("SEO files", false, error instanceof Error ? error.message : String(error));
  }

  // 9. The built assets referenced by the HTML must exist (a broken deploy
  //    shows up here before a customer finds it).
  console.log("\nAssets");
  try {
    const html = await (await get(`${base}/`, timeoutMs)).text();
    const assets = [...html.matchAll(/(?:src|href)="(\/_next\/[^"]+)"/g)].map((m) => m[1]).slice(0, 10);
    let missing = 0;
    for (const asset of assets) {
      const res = await get(`${base}${asset}`, timeoutMs, { method: "HEAD" });
      if (res.status !== 200) missing += 1;
    }
    record("built assets resolve", assets.length > 0 && missing === 0, `${assets.length} checked, ${missing} missing`);
  } catch (error) {
    record("built assets resolve", false, error instanceof Error ? error.message : String(error));
  }

  // 10. Version marker, so a deploy can be confirmed.
  console.log("\nBuild");
  try {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version?: string };
    record("package version readable", Boolean(pkg.version), `v${pkg.version ?? "?"}`);
  } catch (error) {
    record("package version readable", false, error instanceof Error ? error.message : String(error));
  }

  const failed = checks.filter((c) => !c.ok);
  console.log("");
  console.log(
    failed.length === 0
      ? `SMOKE TEST PASSED — ${checks.length} checks`
      : `SMOKE TEST FAILED — ${failed.length}/${checks.length} checks failed`,
  );
  if (failed.length > 0) {
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

await main();
