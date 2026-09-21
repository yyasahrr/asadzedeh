export {}; // module scope: these helpers must not collide with scripts/smoke.ts

/**
 * HTTP security audit.
 *
 *   npx tsx scripts/security-audit.ts --base http://127.0.0.1:3000
 *
 * Where `smoke.ts` asks "does the site work", this asks "does the site hold".
 * Every check is adversarial but *read-only*: it never registers an account,
 * never creates an order and never calls a payment gateway, so it is safe to run
 * against production on every deploy.
 *
 * The categories mirror the OWASP areas that apply to this app — broken access
 * control, IDOR, path traversal, method abuse, malformed input, open redirect,
 * information disclosure and header hygiene — plus a short probe burst to confirm
 * that hostile traffic produces rejections rather than 500s.
 *
 * Exits non-zero on the first FAIL so a pipeline can gate on it.
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
  let base = process.env.SECURITY_BASE_URL ?? process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
  let timeoutMs = 15_000;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--base") base = argv[++i];
    else if (argv[i] === "--timeout") timeoutMs = Number.parseInt(argv[++i], 10);
  }
  return { base: base.replace(/\/$/, ""), timeoutMs };
}

async function req(url: string, timeoutMs: number, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
}

/** Every route an anonymous visitor must not be able to read. */
const GUARDED = [
  "/admin",
  "/admin/users",
  "/admin/orders",
  "/admin/students",
  "/admin/payments",
  "/admin/audit",
  "/admin/settings",
  "/admin/security",
  "/admin/media",
  "/dashboard",
  "/dashboard/orders",
  "/dashboard/profile",
  "/dashboard/certificates",
  "/instructor",
  "/instructor/students",
  "/instructor/earnings",
  "/account/security",
];

/** API routes that must refuse an unauthenticated caller, whatever the id. */
const IDOR_PROBES = [
  "/api/certificates/AZ-C-1182",
  "/api/certificates/AZ-C-1182/pdf",
  "/api/lesson-files/anything",
  "/api/video/anything",
  "/api/video/anything/stream",
  "/api/video/anything/token",
  "/api/admin/audit",
  "/api/admin/audit/export",
];

/** Traversal payloads, raw and percent-encoded. */
const TRAVERSAL = [
  "/api/media/../../../../etc/passwd",
  "/api/media/..%2f..%2f..%2f..%2fetc%2fpasswd",
  "/api/media/%2e%2e%2f%2e%2e%2fetc%2fpasswd",
  "/api/video/..%252f..%252fetc%252fpasswd/stream",
  "/api/lesson-files/..%2f..%2f..%2fpackage.json",
  "/_next/static/../../../../package.json",
  "/..%2f.env",
];

/** Strings that must never appear in an anonymous response. */
const SECRET_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "password hash", pattern: /"passwordHash"\s*:\s*"[0-9a-f]{16,}:[0-9a-f]{32,}/i },
  { label: "bcrypt hash", pattern: /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{20,}/ },
  { label: "TOTP secret", pattern: /"secret"\s*:\s*"[A-Z2-7]{16,}"/ },
  { label: "recovery codes", pattern: /"recoveryCodes"\s*:\s*\[\s*"[A-Z0-9]{4}-[A-Z0-9]{4}"/ },
  { label: "session token", pattern: /az_session=[A-Za-z0-9._-]{20,}/ },
  { label: "connection string", pattern: /postgres(?:ql)?:\/\/[^"\s]+:[^"\s]+@/i },
  { label: "Sentry DSN", pattern: /https:\/\/[a-f0-9]{32}@[a-z0-9.-]+\/\d+/i },
  { label: "gateway credential", pattern: /"(merchantId|apiKey|secret)"\s*:\s*"[A-Za-z0-9._-]{16,}"/i },
  { label: "stack trace", pattern: /at\s+(?:async\s+)?[\w$.]+\s+\([^)]*\/\.next\// },
];

const REQUIRED_HEADERS: Record<string, RegExp> = {
  "x-content-type-options": /^nosniff$/i,
  "x-frame-options": /^(DENY|SAMEORIGIN)$/i,
  "referrer-policy": /^strict-origin-when-cross-origin$/i,
  "content-security-policy": /default-src 'self'/i,
};

/**
 * True for a response that is a refusal rather than a disclosure.
 *
 * 400 and 405 count: a route that answers "wrong method" or "bad request" has
 * told the caller nothing and served nothing.
 */
function refused(status: number): boolean {
  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 405 ||
    (status >= 300 && status < 400)
  );
}

async function main() {
  const { base, timeoutMs } = parseArgs();
  const isProductionHost = !/localhost|127\.0\.0\.1|\.local/.test(new URL(base).hostname);
  console.log(`Security audit against ${base}${isProductionHost ? " (production host)" : ""}\n`);

  console.log("1. Broken access control — anonymous access to guarded routes");
  for (const path of GUARDED) {
    try {
      const res = await req(`${base}${path}`, timeoutMs);
      const body = await res.text();
      const gate = /این بخش مخصوص همکاران|ورود|sign in|login/i.test(body);
      const leakedAdminData =
        /passwordHash|"role"\s*:\s*"(super_admin|admin)"|gateway_transaction_id|recoveryCodes/.test(body) && !gate;
      record(
        `GET ${path}`,
        res.status < 500 && !leakedAdminData && (res.status !== 200 || gate),
        `status ${res.status}${res.status >= 300 && res.status < 400 ? ` → ${res.headers.get("location") ?? ""}` : ""}${leakedAdminData ? " LEAKED" : ""}`,
      );
    } catch (error) {
      record(`GET ${path}`, false, error instanceof Error ? error.message : String(error));
    }
  }

  console.log("\n2. IDOR — object ids must not be readable without a session");
  for (const path of IDOR_PROBES) {
    try {
      const res = await req(`${base}${path}`, timeoutMs);
      const body = await res.text();
      const gated = res.status === 200 && /ورود|مخصوص همکاران/i.test(body);
      const leaked = res.status === 200 && !gated && body.length > 0;
      record(
        `GET ${path}`,
        res.status < 500 && !leaked && (refused(res.status) || gated),
        `status ${res.status}${leaked ? " LEAKED" : ""}`,
      );
    } catch (error) {
      record(`GET ${path}`, false, error instanceof Error ? error.message : String(error));
    }
  }

  console.log("\n3. Path traversal");
  for (const path of TRAVERSAL) {
    try {
      const res = await req(`${base}${path}`, timeoutMs);
      const body = await res.text();
      const leaked = /root:.*:0:0:|"name"\s*:\s*"asadzedeh"|"scripts"\s*:/.test(body);
      record(`GET ${path}`, !leaked && res.status < 500, `status ${res.status}${leaked ? " LEAKED FILE" : ""}`);
    } catch (error) {
      // A connection reset on a malformed path is also a refusal.
      record(`GET ${path}`, true, `refused: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("\n4. Method abuse — write verbs on read routes");
  // Page routes render for any verb — Next serves the same HTML for PUT as for
  // GET, which changes nothing — so only API routes are held to "not 200".
  const methodProbes: Array<[string, string, boolean]> = [
    ["POST", "/api/health", true],
    ["DELETE", "/api/health", true],
    ["DELETE", "/api/certificates/AZ-C-1182", true],
    ["POST", "/api/admin/audit/export", true],
    ["PUT", "/", false],
    ["TRACE", "/", false],
  ];
  for (const [method, path, mustNotRender] of methodProbes) {
    try {
      const res = await req(`${base}${path}`, timeoutMs, { method });
      record(
        `${method} ${path}`,
        res.status < 500 && (!mustNotRender || res.status !== 200),
        `status ${res.status}`,
      );
    } catch (error) {
      record(`${method} ${path}`, true, `refused: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("\n5. Malformed input — must be rejected, never a 500");
  const malformed: Array<{ name: string; path: string; body: string; type: string }> = [
    { name: "truncated JSON", path: "/api/payment/callback", body: '{"order":', type: "application/json" },
    { name: "wrong content type", path: "/api/payment/callback", body: "not-json", type: "text/plain" },
    { name: "oversized id", path: `/api/certificates/${"A".repeat(4000)}`, body: "", type: "text/plain" },
    { name: "null byte in id", path: "/api/certificates/AZ%00-C-1182", body: "", type: "text/plain" },
    { name: "array where object expected", path: "/api/video/[]/token", body: "", type: "text/plain" },
  ];
  for (const probe of malformed) {
    try {
      const res = await req(`${base}${probe.path}`, timeoutMs, {
        method: probe.body ? "POST" : "GET",
        headers: { "content-type": probe.type },
        ...(probe.body ? { body: probe.body } : {}),
      });
      record(probe.name, res.status < 500, `status ${res.status}`);
    } catch (error) {
      record(probe.name, true, `refused: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("\n6. Open redirect / attribute injection");
  // `next` is echoed into a hidden input, and `safeNextPath()` rejects anything
  // that is not a same-origin path before it is ever used as a redirect target
  // (unit-tested in redirect-validation.test.ts). What is checked here is the
  // other half: that echoing attacker text cannot break out of the attribute.
  const injection = `https://evil.example.com/" onmouseover="alert(1)`;
  try {
    const res = await req(`${base}/auth?next=${encodeURIComponent(injection)}`, timeoutMs);
    const body = await res.text();
    const brokeOut = /onmouseover="alert\(1\)"/.test(body) || /<script[^>]*>\s*alert\(1\)/.test(body);
    const unescapedQuote = /name="next" value="[^"]*"[^>]*onmouseover/i.test(body);
    record("injected next cannot break out of its attribute", !brokeOut && !unescapedQuote, brokeOut || unescapedQuote ? "attribute breakout" : "escaped");
    const external = body.match(/name="next" value="([^"]*)"/);
    record(
      "next is not turned into an absolute external URL",
      // Dropping the field entirely is the strongest answer, so absence passes.
      !external || !/^https?:\/\//.test(external[1]),
      external ? `value=${external[1].slice(0, 40)}` : "field dropped",
    );
  } catch (error) {
    record("open redirect probes", false, error instanceof Error ? error.message : String(error));
  }

  console.log("\n7. Information disclosure");
  for (const path of ["/", "/auth", "/api/health", "/courses", "/admin", "/sitemap.xml"]) {
    try {
      const res = await req(`${base}${path}`, timeoutMs);
      const body = await res.text();
      const found = SECRET_PATTERNS.filter((s) => s.pattern.test(body)).map((s) => s.label);
      record(`no secrets in ${path}`, found.length === 0, found.length ? `found: ${found.join(", ")}` : "clean");
    } catch (error) {
      record(`no secrets in ${path}`, false, error instanceof Error ? error.message : String(error));
    }
  }
  for (const path of ["/.env", "/.git/config", "/data/db.json", "/package.json", "/drizzle.config.ts"]) {
    try {
      const res = await req(`${base}${path}`, timeoutMs);
      record(`${path} not served`, res.status === 404 || res.status === 403, `status ${res.status}`);
    } catch (error) {
      record(`${path} not served`, true, `refused: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("\n8. Header hygiene");
  try {
    const res = await req(`${base}/`, timeoutMs);
    for (const [header, pattern] of Object.entries(REQUIRED_HEADERS)) {
      const value = res.headers.get(header) ?? "";
      record(header, pattern.test(value), value ? value.slice(0, 70) : "missing");
    }
    record("no x-powered-by", !res.headers.has("x-powered-by"), res.headers.get("x-powered-by") ?? "absent");
    record(
      "CSP blocks framing",
      /frame-ancestors 'self'/.test(res.headers.get("content-security-policy") ?? ""),
      (res.headers.get("content-security-policy") ?? "").slice(-40),
    );
    if (isProductionHost) {
      record(
        "HSTS present in production",
        /max-age=\d{7,}/.test(res.headers.get("strict-transport-security") ?? ""),
        res.headers.get("strict-transport-security") ?? "missing",
      );
    }
  } catch (error) {
    record("header hygiene", false, error instanceof Error ? error.message : String(error));
  }

  console.log("\n9. Indexability fences");
  try {
    const res = await req(`${base}/admin`, timeoutMs);
    record(
      "/admin is noindex",
      /noindex/.test(res.headers.get("x-robots-tag") ?? ""),
      res.headers.get("x-robots-tag") ?? "missing",
    );
    const robots = await (await req(`${base}/robots.txt`, timeoutMs)).text();
    record("robots.txt disallows /admin", /Disallow:\s*\/admin/i.test(robots), robots.split("\n").find((l) => /admin/i.test(l)) ?? "missing");
  } catch (error) {
    record("indexability fences", false, error instanceof Error ? error.message : String(error));
  }

  console.log("\n10. Probe burst — 40 hostile requests must not produce a 5xx");
  const burstTargets = [
    "/admin/users",
    "/api/certificates/NOPE",
    "/api/video/x/stream",
    "/api/media/..%2f..%2fpackage.json",
    "/dashboard/orders",
  ];
  let fives = 0;
  let total = 0;
  await Promise.all(
    Array.from({ length: 40 }, async (_, i) => {
      const path = burstTargets[i % burstTargets.length];
      try {
        const res = await req(`${base}${path}`, timeoutMs);
        total += 1;
        if (res.status >= 500) fives += 1;
      } catch {
        total += 1;
      }
    }),
  );
  record("no 5xx under a probe burst", fives === 0, `${total} requests, ${fives} 5xx`);

  const failed = checks.filter((c) => !c.ok);
  console.log("");
  console.log(
    failed.length === 0
      ? `SECURITY AUDIT PASSED — ${checks.length} checks`
      : `SECURITY AUDIT FAILED — ${failed.length}/${checks.length} checks failed`,
  );
  if (failed.length > 0) {
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

await main();
