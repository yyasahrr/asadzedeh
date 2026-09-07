import fs from "node:fs";
import path from "node:path";
import { getSql } from "./client";
import { logger } from "@/lib/logger";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

export async function runMigrations() {
  const sql = await getSql();
  await sql.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const applied = new Set(
    (await sql.query<{ id: string }>("SELECT id FROM schema_migrations")).map((r) => r.id),
  );
  if (!fs.existsSync(MIGRATIONS_DIR)) return;
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const body = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    logger.info({ event: "db.migrate", file });
    await sql.execute(body);
    await sql.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
  }
}
