import fs from "node:fs";
import path from "node:path";
import { getEnv, isProduction } from "@/lib/env";
import { logger } from "@/lib/logger";

export type SqlExecutor = {
  kind: "postgres" | "pglite";
  query: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;
  execute: (text: string) => Promise<void>;
  close: () => Promise<void>;
};

let executor: SqlExecutor | null = null;
let initPromise: Promise<SqlExecutor> | null = null;

function pglitePath() {
  return path.join(process.cwd(), "data", "pglite");
}

async function createPostgres(url: string): Promise<SqlExecutor> {
  const postgres = (await import("postgres")).default;
  const env = getEnv();
  const sql = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    onnotice: () => undefined,
  });
  return {
    kind: "postgres",
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await sql.unsafe(text, params as never[]);
      return rows as unknown as T[];
    },
    async execute(text: string) {
      await sql.unsafe(text);
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}

async function createPglite(): Promise<SqlExecutor> {
  const { PGlite } = await import("@electric-sql/pglite");
  fs.mkdirSync(path.dirname(pglitePath()), { recursive: true });
  const client = new PGlite(pglitePath());
  await client.waitReady;
  return {
    kind: "pglite",
    async query<T>(text: string, params: unknown[] = []) {
      const result = await client.query<T>(text, params);
      return result.rows;
    },
    async execute(text: string) {
      await client.exec(text);
    },
    async close() {
      await client.close();
    },
  };
}

export async function getSql(): Promise<SqlExecutor> {
  if (executor) return executor;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const env = getEnv();
    if (env.DATABASE_URL) {
      executor = await createPostgres(env.DATABASE_URL);
      logger.info({ event: "db.connected", kind: "postgres" });
      return executor;
    }
    if (isProduction() && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("DATABASE_URL is required in production");
    }
    executor = await createPglite();
    logger.info({ event: "db.connected", kind: "pglite", path: pglitePath() });
    return executor;
  })();
  try {
    return await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

export async function dbHealth(): Promise<{ ok: boolean; kind?: string; error?: string }> {
  try {
    const sql = await getSql();
    await sql.query("SELECT 1 AS ok");
    return { ok: true, kind: sql.kind };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "db error" };
  }
}

export async function closeDb() {
  if (executor) {
    await executor.close();
    executor = null;
    initPromise = null;
  }
}
