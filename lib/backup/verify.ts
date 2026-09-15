import postgres from "postgres";

/**
 * Post-restore verification.
 *
 * A backup is only as good as the restore you have actually performed. This
 * module is the part that decides whether a restored database is usable, kept
 * separate from the `pg_restore` invocation so it can be tested against a real
 * PostgreSQL server rather than only ever running in an emergency.
 */

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface VerificationReport {
  ok: boolean;
  url: string;
  checks: CheckResult[];
  failures: string[];
}

const PROD_HINTS = ["prod", "production", "live", "asadzedeh.ir"];

/** Refuse to point restore verification at anything that looks like production. */
export function assertRestorableUrl(url: string): void {
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "").toLowerCase();
  const host = parsed.hostname.toLowerCase();
  if (PROD_HINTS.some((hint) => name.includes(hint) || host.includes(hint))) {
    throw new Error(`Refusing to restore into "${url}" — it looks like a production database.`);
  }
  if (!name.startsWith("asadzedeh_restore") && !name.startsWith("asadzedeh_test")) {
    throw new Error(
      `Restore targets must be named "asadzedeh_restore_*" or "asadzedeh_test_*", got "${name}".`,
    );
  }
}

/** Tables that must contain rows for the site to function. */
const CRITICAL_TABLES = ["users", "courses", "orders"] as const;

/** Every table the app reads at boot; a missing one means a partial restore. */
const EXPECTED_TABLES = [
  "users",
  "sessions",
  "courses",
  "classes",
  "products",
  "orders",
  "order_items",
  "payments",
  "enrollments",
  "certificates",
  "tickets",
  "audit_logs",
  "site_settings",
  "seo_entries",
  "seo_redirects",
] as const;

/** Indexes the correctness of the app depends on. */
const REQUIRED_INDEXES = [
  // Duplicate payment callbacks are stopped by the unique gateway reference.
  "payments_gateway_transaction_id_key",
  // Duplicate enrolments are stopped by the unique (user, course) pair.
  "enrollments_user_id_course_slug_key",
  // Duplicate certificates are stopped by the partial unique index.
  "certificates_user_course_active_idx",
] as const;

async function countRows(sql: postgres.Sql, table: string): Promise<number> {
  const rows = await sql.unsafe(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return Number(rows[0]?.n ?? 0);
}

/**
 * Run every check against an already-restored database.
 *
 * Never writes. Safe to run against a copy; the caller is responsible for never
 * passing a production URL (see `assertRestorableUrl`).
 */
export async function verifyRestoredDatabase(url: string): Promise<VerificationReport> {
  assertRestorableUrl(url);
  const sql = postgres(url, { max: 2, connect_timeout: 10, onnotice: () => {} });
  const checks: CheckResult[] = [];

  const add = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

  try {
    // 1. The server answers and reports a usable version.
    const version = await sql`SELECT current_setting('server_version') AS v`;
    add("server responds", true, `PostgreSQL ${version[0]?.v}`);

    // 2. Every expected table exists — a partial restore is a failed restore.
    const present = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    const names = new Set(present.map((r) => r.tablename as string));
    const missing = EXPECTED_TABLES.filter((t) => !names.has(t));
    add(
      "all tables present",
      missing.length === 0,
      missing.length === 0 ? `${EXPECTED_TABLES.length} tables` : `missing: ${missing.join(", ")}`,
    );

    if (missing.length > 0) {
      return finish(url, checks);
    }

    // 3. Critical tables are not empty.
    for (const table of CRITICAL_TABLES) {
      const n = await countRows(sql, table);
      add(`${table} not empty`, n > 0, `${n} rows`);
    }

    // 4. The indexes the business invariants rely on survived the restore.
    const indexes = await sql`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`;
    const indexNames = new Set(indexes.map((r) => r.indexname as string));
    for (const index of REQUIRED_INDEXES) {
      add(`index ${index}`, indexNames.has(index), indexNames.has(index) ? "present" : "MISSING");
    }

    // 5. No negative inventory — the CHECK constraints are enforced, so a
    //    violation here means the dump came from a broken database.
    const negativeStock = await sql`SELECT COUNT(*)::int AS n FROM products WHERE stock < 0 OR reserved_stock < 0`;
    add(
      "no negative product stock",
      Number(negativeStock[0]?.n) === 0,
      `${negativeStock[0]?.n} offending rows`,
    );

    const negativeSeats = await sql`SELECT COUNT(*)::int AS n FROM classes WHERE remaining < 0 OR reserved_seats < 0`;
    add("no negative class seats", Number(negativeSeats[0]?.n) === 0, `${negativeSeats[0]?.n} offending rows`);

    // 6. Referential integrity that the app assumes but the schema does not
    //    enforce everywhere (payload-carried relations).
    const orphanOrders = await sql`
      SELECT COUNT(*)::int AS n FROM orders o
       WHERE o.user_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.user_id)`;
    add("no orphan orders", Number(orphanOrders[0]?.n) === 0, `${orphanOrders[0]?.n} orphan orders`);

    const orphanEnrolments = await sql`
      SELECT COUNT(*)::int AS n FROM enrollments e
       WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = e.user_id)`;
    add(
      "no orphan enrolments",
      Number(orphanEnrolments[0]?.n) === 0,
      `${orphanEnrolments[0]?.n} orphan enrolments`,
    );

    // 7. Money columns are non-negative.
    const badMoney = await sql`
      SELECT (SELECT COUNT(*) FROM orders WHERE amount < 0)
           + (SELECT COUNT(*) FROM payments WHERE amount < 0) AS n`;
    add("no negative amounts", Number(badMoney[0]?.n) === 0, `${badMoney[0]?.n} negative amounts`);

    // 8. Every order has a status the UI can render.
    const noStatus = await sql`SELECT COUNT(*)::int AS n FROM orders WHERE status IS NULL OR status = ''`;
    add("every order has a status", Number(noStatus[0]?.n) === 0, `${noStatus[0]?.n} statusless orders`);

    // 9. Sessions are expired, not live. A restored session table must not let
    //    someone back in with a pre-backup cookie. Revocation is carried in the
    //    payload, not a column, so both are checked.
    const liveSessions = await sql`
      SELECT COUNT(*)::int AS n FROM sessions
       WHERE COALESCE(payload->>'revokedAt', '') = ''
         AND (expires_at IS NULL OR expires_at > now())`;
    add(
      "no live sessions restored",
      Number(liveSessions[0]?.n) === 0,
      `${liveSessions[0]?.n} sessions would still be valid — revoke them before going live`,
    );

    // 10. Settings row exists; the app reads it on every request.
    const settings = await sql`SELECT COUNT(*)::int AS n FROM site_settings`;
    add("site settings present", Number(settings[0]?.n) > 0, `${settings[0]?.n} rows`);
  } catch (error) {
    add("verification completed", false, error instanceof Error ? error.message : String(error));
  } finally {
    await sql.end({ timeout: 5 });
  }

  return finish(url, checks);
}

function finish(url: string, checks: CheckResult[]): VerificationReport {
  const failures = checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`);
  return { ok: failures.length === 0, url, checks, failures };
}

/** Render a report for a terminal. */
export function formatReport(report: VerificationReport): string {
  const lines = [`Restored database: ${report.url}`, ""];
  for (const check of report.checks) {
    lines.push(`  ${check.ok ? "PASS" : "FAIL"}  ${check.name} — ${check.detail}`);
  }
  lines.push("");
  lines.push(report.ok ? "RESULT: RESTORE VERIFIED" : `RESULT: RESTORE NOT USABLE (${report.failures.length} failures)`);
  return lines.join("\n");
}
