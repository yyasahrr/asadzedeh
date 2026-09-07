import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import postgres from "postgres";
import { assertRestorableUrl, formatReport, verifyRestoredDatabase } from "../lib/backup/verify.js";

const run = promisify(execFile);

/**
 * Restore a backup into a throwaway database and prove it is usable.
 *
 *   npx tsx scripts/verify-backup-restore.ts --dump ./backups/latest.dump
 *
 * Safety rules, enforced rather than documented:
 *  - the target database is created fresh and dropped on exit;
 *  - the target name must start with `asadzedeh_restore_`, so a production URL
 *    cannot be restored over by accident;
 *  - nothing here ever writes to the source.
 *
 * A backup you have never restored is a hypothesis, not a backup. Run this on a
 * schedule (see docs/BACKUP.md) and treat a failure as an incident.
 */

interface Args {
  dump?: string;
  port: number;
  host: string;
  user: string;
  password: string;
  keep: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    port: Number.parseInt(process.env.PGPORT ?? "5432", 10),
    host: process.env.PGHOST ?? "127.0.0.1",
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "",
    keep: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--dump") args.dump = argv[++i];
    else if (flag === "--host") args.host = argv[++i];
    else if (flag === "--port") args.port = Number.parseInt(argv[++i], 10);
    else if (flag === "--user") args.user = argv[++i];
    else if (flag === "--password") args.password = argv[++i];
    else if (flag === "--keep") args.keep = true;
  }
  return args;
}

function usage(): never {
  console.error("Usage: npx tsx scripts/verify-backup-restore.ts --dump <file.dump> [--host h] [--port p] [--user u] [--password p] [--keep]");
  process.exit(2);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dump) usage();

  const database = `asadzedeh_restore_${Date.now().toString(36)}`;
  const adminUrl = `postgres://${args.user}:${encodeURIComponent(args.password)}@${args.host}:${args.port}/postgres`;
  const targetUrl = `postgres://${args.user}:${encodeURIComponent(args.password)}@${args.host}:${args.port}/${database}`;

  // Fail before touching anything if the URL shape is unsafe.
  assertRestorableUrl(targetUrl);

  const workDir = await mkdtemp(join(tmpdir(), "asadzedeh-restore-"));
  const admin = postgres(adminUrl, { max: 1, connect_timeout: 10, onnotice: () => {} });

  try {
    console.log(`> creating temporary database "${database}"`);
    await admin.unsafe(`CREATE DATABASE ${database}`);

    console.log(`> restoring ${args.dump}`);
    // pg_restore against a plain-text dump needs psql instead; try both.
    try {
      await run("pg_restore", ["--no-owner", "--no-privileges", "--dbname", targetUrl, args.dump], {
        timeout: 30 * 60_000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/input file does not appear to be a valid archive/i.test(message)) {
        console.log("> not a custom-format archive, replaying as plain SQL");
        await run("psql", [targetUrl, "--quiet", "--single-transaction", "--file", args.dump], {
          timeout: 30 * 60_000,
        });
      } else {
        throw error;
      }
    }

    console.log("> verifying");
    const report = await verifyRestoredDatabase(targetUrl);
    console.log("");
    console.log(formatReport(report));

    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error("");
    console.error("RESULT: RESTORE FAILED");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    if (!args.keep) {
      try {
        console.log("");
        console.log(`> dropping temporary database "${database}"`);
        await admin.unsafe(
          `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${database}' AND pid <> pg_backend_pid()`,
        );
        await admin.unsafe(`DROP DATABASE IF EXISTS ${database}`);
      } catch (error) {
        console.error(`could not drop ${database}: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log(`> --keep: leaving "${database}" in place for inspection`);
    }
    await admin.end({ timeout: 5 });
    await rm(workDir, { recursive: true, force: true });
  }
}

await main();
