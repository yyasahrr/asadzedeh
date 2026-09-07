import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertRestorableUrl, verifyRestoredDatabase } from "@/lib/backup/verify";
import { startTestDatabase, type TestDatabase } from "./helpers/pg";

/**
 * The restore check, exercised against a real PostgreSQL server.
 *
 * A verification routine that only ever passes is worse than none, so these
 * tests deliberately corrupt the database and require the report to fail.
 */

let db: TestDatabase;
let client: typeof import("@/lib/db/client");
let sql: Awaited<ReturnType<typeof import("@/lib/db/client").getSql>>;

beforeAll(async () => {
  db = await startTestDatabase();
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: db.url,
    APP_SECRET: "test-secret-for-ci-only-0123456789",
  });

  client = await import("@/lib/db/client");
  const { runMigrations } = await import("@/lib/db/migrate");
  sql = await client.getSql();
  await runMigrations();
}, 120_000);

beforeEach(async () => {
  for (const table of ["order_items", "payments", "orders", "enrollments", "certificates", "sessions", "courses", "users"]) {
    await sql.execute(`DELETE FROM ${table}`);
  }
  // A restore in good standing has at least the critical rows and no live sessions.
  await sql.execute(
    `INSERT INTO users (id, phone, password_hash, role, payload)
     VALUES ('u-1', '09120000001', 'x', 'student', '{}'::jsonb)`,
  );
  await sql.execute(
    `INSERT INTO courses (slug, title, price, payload) VALUES ('carpet', 'فرش‌بافی', 1000, '{}'::jsonb)`,
  );
  await sql.execute(
    `INSERT INTO orders (id, user_id, status, amount, payload) VALUES ('AZ-1', 'u-1', 'پرداخت شده', 1000, '{}'::jsonb)`,
  );
  await sql.execute(`INSERT INTO site_settings (id, payload) VALUES ('default', '{}'::jsonb) ON CONFLICT (id) DO NOTHING`);
}, 30_000);

afterAll(async () => {
  await client?.closeDb();
  await db?.stop();
});

describe("restore verification — URL safety", () => {
  it("refuses anything that is not a dedicated restore target", () => {
    for (const bad of [
      "postgres://u:p@db.asadzedeh.ir:5432/asadzedeh",
      "postgres://u:p@127.0.0.1:5432/asadzedeh_production",
      "postgres://u:p@127.0.0.1:5432/live_db",
      "postgres://u:p@127.0.0.1:5432/postgres",
    ]) {
      expect(() => assertRestorableUrl(bad), bad).toThrow();
    }
  });

  it("accepts a clearly-named throwaway database", () => {
    expect(() => assertRestorableUrl("postgres://u:p@127.0.0.1:5432/asadzedeh_restore_abc123")).not.toThrow();
  });
});

describe("restore verification — a healthy restore passes", () => {
  it("reports ok for a migrated database with the critical rows", async () => {
    const report = await verifyRestoredDatabase(db.url);
    expect(report.ok, report.failures.join("; ")).toBe(true);
    expect(report.checks.length).toBeGreaterThan(10);
    expect(report.checks.every((c) => c.ok)).toBe(true);
  });

  it("names the PostgreSQL version it verified against", async () => {
    const report = await verifyRestoredDatabase(db.url);
    const version = report.checks.find((c) => c.name === "server responds");
    expect(version?.detail).toMatch(/PostgreSQL \d/);
  });
});

describe("restore verification — a broken restore fails", () => {
  it("fails when a critical table is empty", async () => {
    await sql.execute("DELETE FROM orders");
    const report = await verifyRestoredDatabase(db.url);
    expect(report.ok).toBe(false);
    expect(report.failures.join("; ")).toContain("orders not empty");
  });

  it("fails when a table is missing entirely", async () => {
    await sql.execute("ALTER TABLE certificates RENAME TO certificates_bak");
    try {
      const report = await verifyRestoredDatabase(db.url);
      expect(report.ok).toBe(false);
      expect(report.failures.join("; ")).toContain("all tables present");
    } finally {
      await sql.execute("ALTER TABLE certificates_bak RENAME TO certificates");
    }
  });

  it("fails when the duplicate-callback index is gone", async () => {
    await sql.execute("ALTER TABLE payments DROP CONSTRAINT payments_gateway_transaction_id_key");
    try {
      const report = await verifyRestoredDatabase(db.url);
      expect(report.ok).toBe(false);
      expect(report.failures.join("; ")).toContain("payments_gateway_transaction_id_key");
    } finally {
      // Later tests share this server; put the invariant back.
      await sql.execute("ALTER TABLE payments ADD CONSTRAINT payments_gateway_transaction_id_key UNIQUE (gateway_transaction_id)");
    }
  });

  it("fails when a restored session would still be valid", async () => {
    await sql.execute(
      `INSERT INTO sessions (token, user_id, created_at, expires_at, payload)
       VALUES ('tok-live', 'u-1', now(), now() + interval '1 day', '{}'::jsonb)`,
    );
    // Sanity: an explicitly revoked session is not a failure.
    await sql.execute(
      `INSERT INTO sessions (token, user_id, created_at, expires_at, payload)
       VALUES ('tok-revoked', 'u-1', now(), now() + interval '1 day', '{"revokedAt":"2026-01-01T00:00:00.000Z"}'::jsonb)`,
    );
    const report = await verifyRestoredDatabase(db.url);
    expect(report.ok).toBe(false);
    expect(report.failures.join("; ")).toContain("no live sessions restored");
  });

  it("fails when an order points at a user who is not there", async () => {
    await sql.execute("DELETE FROM users");
    const report = await verifyRestoredDatabase(db.url);
    expect(report.ok).toBe(false);
    expect(report.failures.join("; ")).toContain("orphan orders");
  });

  it("fails when an order has no status", async () => {
    await sql.execute("UPDATE orders SET status = '' WHERE id = 'AZ-1'");
    const report = await verifyRestoredDatabase(db.url);
    expect(report.ok).toBe(false);
    expect(report.failures.join("; ")).toContain("every order has a status");
  });
});
