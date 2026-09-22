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
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run destructive PostgreSQL tests with NODE_ENV=production.");
  }
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
  const externalUrl = process.env.TEST_DATABASE_URL;
  if (externalUrl) {
    assertSafeTestUrl(externalUrl);
    const parsed = new URL(externalUrl);
    console.info(`[pg-test] host=${parsed.hostname} port=${parsed.port || "5432"} database=${parsed.pathname.slice(1)}`);
    return { url: externalUrl, port: Number(parsed.port || 5432), async stop() {} };
  }
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
    // `C.UTF-8` exists on common Linux images but not on PostgreSQL for
    // Windows. Encoding is explicit, so the portable `C` locale still stores
    // and round-trips Persian text correctly on both platforms.
    initdbFlags: ["--encoding=UTF8", `--locale=${process.platform === "win32" ? "C" : "C.UTF-8"}`],
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(database);

  const url = `postgres://asadzedeh:asadzedeh@127.0.0.1:${port}/${database}`;
  assertSafeTestUrl(url);
  console.info(`[pg-test] host=127.0.0.1 port=${port} database=${database}`);

  return {
    url,
    port,
    async stop() {
      try {
        await pg.stop();
      } catch {
        // Best effort: if stop fails, still try to clean up directory.
      }

      // On Windows, PostgreSQL may still hold file handles for a short
      // period after stop(). Retry deletion with backoff instead of failing
      // the entire test run with EPERM.
      const delays = [100, 300, 600, 1000, 2000];
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          if (fs.existsSync(databaseDir)) {
            fs.rmSync(databaseDir, { recursive: true, force: true });
          }
          break;
        } catch (error) {
          const isLast = attempt === delays.length;
          const code = (error as NodeJS.ErrnoException)?.code;
          const isEphemeral = code === "EPERM" || code === "EBUSY" || code === "ENOTEMPTY";
          if (!isEphemeral || isLast) {
            // On last attempt, log but don't crash the test process if it's just cleanup.
            // Throw only if directory still exists and error is not ephemeral.
            if (isLast && fs.existsSync(databaseDir)) {
              console.warn(`[pg-test] failed to remove ${databaseDir} after retries:`, error);
            }
            break;
          }
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
      }
    },
  };
}
