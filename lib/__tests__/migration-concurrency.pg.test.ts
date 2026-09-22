import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertSafeTestUrl, startTestDatabase, type TestDatabase } from "./helpers/pg";

let database: TestDatabase | undefined;

describe("migration concurrency", () => {
  beforeAll(async () => {
    database = await startTestDatabase();
    assertSafeTestUrl(database.url);
    process.env.DATABASE_URL = database.url;
    const { closeDb } = await import("@/lib/db/client");
    await closeDb();
  });

  afterAll(async () => {
    const { closeDb } = await import("@/lib/db/client");
    await closeDb();
    await database?.stop();
    delete process.env.DATABASE_URL;
  });

  it("serializes simultaneous runners and records every migration exactly once", async () => {
    const { runMigrations } = await import("@/lib/db/migrate");
    await Promise.all([runMigrations(), runMigrations(), runMigrations(), runMigrations()]);
    const { getSql } = await import("@/lib/db/client");
    const sql = await getSql();
    const duplicates = await sql.query<{ id: string; count: number }>("SELECT id, count(*)::int AS count FROM schema_migrations GROUP BY id HAVING count(*) <> 1");
    const latest = await sql.query<{ n: number }>("SELECT count(*)::int AS n FROM schema_migrations WHERE id='0007_sms_automation.sql'");
    const tables = await sql.query<{ n: number }>("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('sms_templates','sms_rules','sms_delivery_logs')");
    expect(duplicates).toEqual([]);
    expect(Number(latest[0]?.n)).toBe(1);
    expect(Number(tables[0]?.n)).toBe(3);
  });

  it("rolls back failed migration bookkeeping and releases the advisory lock", async () => {
    const { getSql } = await import("@/lib/db/client");
    const sql = await getSql();
    await sql.execute("DROP TABLE IF EXISTS migration_failure_probe");
    await sql.query("DELETE FROM schema_migrations WHERE id=$1", ["9999_lock_failure.sql"]);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "asadzedeh-failing-migration-"));
    const file = path.join(directory, "9999_lock_failure.sql");
    fs.writeFileSync(file, "CREATE TABLE migration_failure_probe(id integer); SELECT missing_migration_function();");
    const { runMigrations } = await import("@/lib/db/migrate");
    await expect(runMigrations({ migrationsDir: directory })).rejects.toThrow();
    expect(await sql.query("SELECT id FROM schema_migrations WHERE id='9999_lock_failure.sql'")).toEqual([]);
    expect(Number((await sql.query<{ n: number }>("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name='migration_failure_probe'"))[0]?.n)).toBe(0);

    fs.writeFileSync(file, "CREATE TABLE migration_failure_probe(id integer);");
    await runMigrations({ migrationsDir: directory });
    expect((await sql.query("SELECT id FROM schema_migrations WHERE id='9999_lock_failure.sql'")).length).toBe(1);
    fs.rmSync(directory, { recursive: true, force: true });
  });
});
