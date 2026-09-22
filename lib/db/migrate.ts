import fs from "node:fs";
import path from "node:path";
import { getSql } from "./client";
import { logger } from "@/lib/logger";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

export async function runMigrations(options: { migrationsDir?: string } = {}) {
  const sql = await getSql();
  const migrationsDir = options.migrationsDir ?? MIGRATIONS_DIR;
  if (!fs.existsSync(migrationsDir)) return;
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) return;

  // PostgreSQL's `IF NOT EXISTS` is not a concurrency primitive: two sessions
  // can both pass the catalog check and then race while creating the same
  // relation/type. A transaction-scoped advisory lock serializes the complete
  // migration protocol across processes while still being released
  // automatically on commit, rollback, connection loss, or an exception.
  await sql.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock($1, $2)", [1_097_618_756, 1_296_518_215]);
    await tx.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const applied = new Set(
      (await tx.query<{ id: string }>("SELECT id FROM schema_migrations")).map((r) => r.id),
    );
    for (const file of files) {
      if (applied.has(file)) continue;
      const body = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      logger.info({ event: "db.migrate", file });
      await tx.execute(body);
      await tx.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
      applied.add(file);
    }
  });
}
