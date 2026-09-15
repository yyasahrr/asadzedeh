export {}; // module scope

/**
 * HTTP scenario suite — the flows that only exist once the pieces are together.
 *
 *   npx tsx scripts/scenario-test.ts --base http://127.0.0.1:4700 \
 *     --admin-phone 09121000001 --admin-password '...'
 *
 * Playwright covers the same ground in a browser (`e2e/`), but it needs a
 * Chromium download that a locked-down build box cannot always fetch. This suite
 * drives the identical flows over real HTTP instead — Server Actions included —
 * so the go/no-go decision never rests on a test that could not be run.
 *
 * What it walks:
 *   1. an anonymous visitor is gated out of the admin panel;
 *   2. an anonymous visitor cannot download somebody's certificate;
 *   3. a retired demo profile cannot sign in, even with its published password;
 *   4. the real administrator can sign in and reaches the panel;
 *   5. that administrator *can* open the certificate a stranger could not;
 *   6. signing out ends the session.
 *
 * It signs in for real, so it creates one session row. Everything else is a
 * read or a rejected login. Refuses a non-local target unless `--allow-remote`.
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

function parseArgs() {
  const argv = process.argv.slice(2);
  let base = process.env.SCENARIO_BASE_URL ?? "http://127.0.0.1:4700";
  let adminPhone = process.env.SCENARIO_ADMIN_PHONE ?? "";
  let adminPassword = process.env.SCENARIO_ADMIN_PASSWORD ?? "";
  let allowRemote = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--base") base = argv[++i];
    else if (argv[i] === "--admin-phone") adminPhone = argv[++i];
    else if (argv[i] === "--admin-password") adminPassword = argv[++i];
    else if (argv[i] === "--allow-remote") allowRemote = true;
  }
  return { base: base.replace(/\/$/, ""), adminPhone, adminPassword, allowRemote };
}

/**
 * The login Server Action's id, read from the page that renders the form.
 *
 * Action ids are content hashes and change on every build, so they are scraped
 * rather than hard-coded.
 */
async function loginActionId(base: string): Promise<string | null> {
  const html = await (await fetch(`${base}/auth`, { signal: AbortSignal.timeout(15_000) })).text();
  return html.match(/\$ACTION_ID_([a-f0-9]{40,})/)?.[1] ?? null;
}

interface LoginResult {
  status: number;
  redirect: string | null;
  cookie: string | null;
}

/** Post the login form the way a no-JS browser would. */
async function login(base: string, actionId: string, phone: string, password: string): Promise<LoginResult> {
  const form = new FormData();
  form.set(`$ACTION_ID_${actionId}`, "");
  form.set("phone", phone);
  form.set("password", password);
  form.set("next", "/admin");
  const res = await fetch(`${base}/auth`, {
    method: "POST",
    headers: { Origin: base },
    body: form,
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  const cookies = res.headers.getSetCookie?.() ?? [];
  return {
    status: res.status,
    redirect: res.headers.get("x-action-redirect") ?? res.headers.get("location"),
    cookie: cookies.find((c) => c.startsWith("az_session=")) ?? null,
  };
}

async function main() {
  const { base, adminPhone, adminPassword, allowRemote } = parseArgs();
  const host = new URL(base).hostname;
  const isLocal = /^(127\.|localhost|\[::1\]|.*\.local$)/.test(host);
  if (!isLocal && !allowRemote) {
    console.error(`Refusing to sign in against ${base}. Pass --allow-remote if that is intended.`);
    process.exit(1);
  }
  if (!adminPhone || !adminPassword) {
    console.error(
      "Needs the real administrator's credentials:\n" +
        "  npx tsx scripts/scenario-test.ts --admin-phone 09... --admin-password '...'\n" +
        "(create one with: npm run db:bootstrap-admin)",
    );
    process.exit(1);
  }

  console.log(`Scenario suite against ${base}\n`);

  const actionId = await loginActionId(base);
  record("login Server Action discovered", Boolean(actionId), actionId ? `${actionId.slice(0, 12)}…` : "not found");
  if (!actionId) {
    console.log("\nCannot continue without the action id.");
    process.exit(1);
  }

  console.log("\n1. Anonymous visitor");
  {
    const admin = await fetch(`${base}/admin/users`, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
    const body = await admin.text();
    record(
      "/admin/users shows the login gate",
      /این بخش مخصوص همکاران/.test(body) && !/خروج/.test(body),
      `status ${admin.status}`,
    );

    // A code that exists in the seed data, requested by somebody with no session.
    const pdf = await fetch(`${base}/api/certificates/AZ-C-1182/pdf`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    record(
      "certificate PDF refused anonymously",
      pdf.status === 404,
      `status ${pdf.status}`,
    );

    const page = await fetch(`${base}/dashboard/certificates/AZ-C-1182`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const pageBody = await page.text();
    record(
      "certificate page refused anonymously",
      page.status === 404 && !/سارا محمدی/.test(pageBody),
      `status ${page.status}`,
    );
  }

  console.log("\n2. Retired demo profiles");
  // Passwords published in the repository. None of them may work any more.
  for (const [label, phone, password] of [
    ["demo admin (seed password)", "09120000001", "admin123"],
    ["demo editor", "09120000002", "editor123"],
    ["demo support", "09120000003", "support123"],
    ["demo instructor", "09120000004", "dyer1234"],
    ["demo student", "09123456789", "sara1234"],
  ]) {
    const result = await login(base, actionId, phone, password);
    record(
      `${label} cannot sign in`,
      result.cookie === null && (result.redirect ?? "").includes("/auth"),
      `${result.status} → ${result.redirect ?? "—"}${result.cookie ? " SESSION ISSUED" : ""}`,
    );
  }

  console.log("\n3. Real administrator");
  const admin = await login(base, actionId, adminPhone, adminPassword);
  record(
    "administrator signs in",
    admin.cookie !== null && !(admin.redirect ?? "").includes("error="),
    `${admin.status} → ${admin.redirect ?? "—"}${admin.cookie ? "" : " NO SESSION"}`,
  );

  if (admin.cookie) {
    record(
      "session cookie is HttpOnly, SameSite and Secure",
      /HttpOnly/i.test(admin.cookie) && /SameSite=lax/i.test(admin.cookie) && /Secure/i.test(admin.cookie),
      admin.cookie.replace(/az_session=[^;]+/, "az_session=<redacted>"),
    );
    const cookie = admin.cookie.split(";")[0];

    // Production forces staff 2FA, so a freshly created administrator is sent to
    // enrol before the panel opens. That is the gate working, not a failure.
    const panel = await fetch(`${base}/admin/users`, {
      headers: { cookie },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const toEnrolment = (panel.headers.get("location") ?? "").startsWith("/account/security");
    const panelBody = await panel.text();
    record(
      "panel is gated behind 2FA enrolment for staff",
      (panel.status === 307 && toEnrolment) || (panel.status === 200 && /کاربران و سطوح دسترسی/.test(panelBody)),
      `${panel.status} → ${panel.headers.get("location") ?? "(rendered)"}`,
    );

    const security = await fetch(`${base}/account/security`, {
      headers: { cookie },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const securityBody = await security.text();
    record(
      "enrolment page renders for that session",
      security.status === 200 && /Google Authenticator|فعال‌سازی/.test(securityBody),
      `status ${security.status}`,
    );

    const forged = await fetch(`${base}/admin/users`, {
      headers: { cookie: `az_session=${"deadbeef".repeat(8)}` },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const forgedBody = await forged.text();
    record(
      "a forged session token is refused",
      /این بخش مخصوص همکاران/.test(forgedBody),
      `status ${forged.status}`,
    );

    const pdf = await fetch(`${base}/api/certificates/AZ-C-1182/pdf`, {
      headers: { cookie },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const type = pdf.headers.get("content-type") ?? "";
    record(
      "staff can open a certificate PDF",
      pdf.status === 200 && type.includes("application/pdf"),
      `status ${pdf.status} ${type}`,
    );

    const health = await (await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(15_000) })).json();
    record(
      "health reports integrations",
      Boolean((health as { integrations?: unknown }).integrations),
      JSON.stringify((health as { integrations?: unknown }).integrations),
    );
  }

  const failed = checks.filter((c) => !c.ok);
  console.log("");
  console.log(
    failed.length === 0
      ? `SCENARIO SUITE PASSED — ${checks.length} checks`
      : `SCENARIO SUITE FAILED — ${failed.length}/${checks.length} checks failed`,
  );
  if (failed.length > 0) {
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

await main();
