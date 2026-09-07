import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

/**
 * A real PostgreSQL server for integration and concurrency tests.
 *
 * PGlite is a single-connection embedded database, so it can prove that a guard
 * clause is written correctly but it can never actually contend with itself.
 * These tests need genuine parallel connections to be meaningful, so they run
 * against PostgreSQL started from the `embedded-postgres` binaries.
 */

const PROD_HINTS = ["prod", "production", "live", "asadzedeh.ir"];

/**
 * Refuse to point a destructive test run at anything that looks like a real
 * database. Tests create and drop tables; this is the last line of defence.
 */
export function assertSafeTestUrl(url: string | undefined): void {
  if (!url) return;
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "").toLowerCase();
  const host = parsed.hostname.toLowerCase();
  if (PROD_HINTS.some((hint) => name.includes(hint) || host.includes(hint))) {
    throw new Error(
      `Refusing to run destructive tests against "${url}" — it looks like a production database.`,
    );
  }
  if (!name.startsWith("asadzedeh_test")) {
    throw new Error(
      `Test database names must start with "asadzedeh_test", got "${name}".`,
    );
  }
}

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

export interface TestDatabase {
  url: string;
  port: number;
  stop: () => Promise<void>;
}

/** Boot a throwaway PostgreSQL cluster with one empty `asadzedeh_test` database. */
export async function startTestDatabase(): Promise<TestDatabase> {
  const port = await freePort();
  const databaseDir = fs.mkdtempSync(path.join(os.tmpdir(), "asadzedeh-pg-"));
  const database = "asadzedeh_test";

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "asadzedeh",
    password: "asadzedeh",
    port,
    persistent: false,
    // Production runs UTF-8. The embedded default is SQL_ASCII, which rejects
    // the Persian text this app stores and would hide real encoding bugs.
    initdbFlags: ["--encoding=UTF8", "--locale=C.UTF-8"],
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(database);

  const url = `postgres://asadzedeh:asadzedeh@127.0.0.1:${port}/${database}`;
  assertSafeTestUrl(url);

  return {
    url,
    port,
    async stop() {
      try {
        await pg.stop();
      } finally {
        fs.rmSync(databaseDir, { recursive: true, force: true });
      }
    },
  };
}
