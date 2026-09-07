import fs from "node:fs";
import path from "node:path";
import { getEnv, isProduction } from "@/lib/env";
import { logger } from "@/lib/logger";

export type SqlExecutor = {
  kind: "postgres" | "pglite";
  query: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;
  execute: (text: string) => Promise<void>;
  close: () => Promise<void>;
  /**
   * Run `fn` inside a single database transaction.
   * Rolls back on any thrown error. Nested calls are rejected on purpose —
   * compose transactions at the service layer instead.
   */
  transaction: <T>(fn: (tx: SqlExecutor) => Promise<T>) => Promise<T>;
};

/** Wrap a driver transaction handle in the same shape as the pooled executor. */
function wrapTransaction(
  kind: SqlExecutor["kind"],
  runner: {
    query: <T>(text: string, params?: unknown[]) => Promise<T[]>;
    execute: (text: string) => Promise<void>;
  },
): SqlExecutor {
  return {
    kind,
    query: (text, params = []) => runner.query(text, params),
    execute: (text) => runner.execute(text),
    close: async () => undefined,
    transaction: () => {
      throw new Error("Nested transactions are not supported");
    },
  };
}

/**
 * Next.js can bundle this module into more than one server chunk, so module-level
 * state is not enough: two copies would each open their own connection. For
 * PostgreSQL that is merely wasteful, but PGlite is an embedded database and a
 * second instance on the same directory fails with "Connection closed".
 * Hanging the handle off `globalThis` makes it a true per-process singleton.
 */
const shared = globalThis as unknown as {
  __asadzedehSql?: SqlExecutor | null;
  __asadzedehSqlInit?: Promise<SqlExecutor> | null;
};

/**
 * Where the development fallback database lives.
 * Set `PGLITE_DIR=memory` for an ephemeral in-memory database (tests, CI).
 */
function pgliteDir(): string {
  return process.env.PGLITE_DIR || path.join(process.cwd(), "data", "pglite");
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
    async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      const result = await sql.begin(async (tx) =>
        fn(
          wrapTransaction("postgres", {
            query: async <R>(text: string, params: unknown[] = []) =>
              (await tx.unsafe(text, params as never[])) as unknown as R[],
            execute: async (text: string) => {
              await tx.unsafe(text);
            },
          }),
        ),
      );
      return result as T;
    },
  };
}

async function createPglite(): Promise<SqlExecutor> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = pgliteDir();
  const inMemory = dir === "memory";
  if (!inMemory) fs.mkdirSync(path.dirname(dir), { recursive: true });
  const client = inMemory ? new PGlite() : new PGlite(dir);
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
    async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      return client.transaction(async (tx) =>
        fn(
          wrapTransaction("pglite", {
            query: async <R>(text: string, params: unknown[] = []) => {
              const result = await tx.query<R>(text, params);
              return result.rows;
            },
            execute: async (text: string) => {
              await tx.exec(text);
            },
          }),
        ),
      );
    },
  };
}

export async function getSql(): Promise<SqlExecutor> {
  if (shared.__asadzedehSql) return shared.__asadzedehSql;
  if (shared.__asadzedehSqlInit) return shared.__asadzedehSqlInit;
  shared.__asadzedehSqlInit = (async () => {
    const env = getEnv();
    if (env.DATABASE_URL) {
      shared.__asadzedehSql = await createPostgres(env.DATABASE_URL);
      logger.info({ event: "db.connected", kind: "postgres" });
      return shared.__asadzedehSql;
    }
    if (isProduction() && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("DATABASE_URL is required in production");
    }
    shared.__asadzedehSql = await createPglite();
    logger.info({ event: "db.connected", kind: "pglite", path: pgliteDir() });
    return shared.__asadzedehSql;
  })();
  try {
    return await shared.__asadzedehSqlInit;
  } catch (error) {
    shared.__asadzedehSqlInit = null;
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
  if (shared.__asadzedehSql) {
    await shared.__asadzedehSql.close();
    shared.__asadzedehSql = null;
    shared.__asadzedehSqlInit = null;
  }
}
