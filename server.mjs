import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import next from "next";
import postgres from "postgres";

const dev = process.argv.includes("--dev");
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL && !dev) {
  console.error(
    "FATAL: DATABASE_URL is required in production. PostgreSQL is the only datastore; " +
      "there is no JSON, SQLite or demo fallback to start on.",
  );
  process.exit(1);
}

/**
 * PostgreSQL is the only store. The redirect layer below reads it directly so an
 * operator can add a 301 without a rebuild; nothing is cached on disk.
 */
const sql = DATABASE_URL
  ? postgres(DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      onnotice: () => {},
    })
  : null;

/* ---------------------------------------------------------------- redirects */

let redirectCache = { at: 0, rows: [] };
const REDIRECT_TTL_MS = 30_000;

/**
 * Is this a safe redirect target?
 *
 * The admin panel already refuses anything but a local path, but this layer
 * reads the table directly, so a row written by a migration or by hand would
 * bypass that check. Re-validating here means a bad row cannot turn the site
 * into an open redirect — defence in depth, not a second opinion.
 */
function isLocalPath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("://");
}

async function refreshRedirects() {
  if (Date.now() - redirectCache.at < REDIRECT_TTL_MS) return;
  redirectCache.at = Date.now();
  try {
    // The custom server cannot share Next's TypeScript database adapter. In
    // production it queries PostgreSQL directly; development/PGlite consumes
    // the redirect snapshot that the store already writes for this purpose.
    const rows = sql
      ? await sql.unsafe("SELECT from_path, to_path, status_code FROM seo_redirects WHERE enabled = TRUE")
      : await readRedirectSnapshot();
    const usable = rows.filter((r) => r.from_path && isLocalPath(r.to_path));
    const rejected = rows.length - usable.length;
    if (rejected > 0) {
      console.warn(`> ignoring ${rejected} redirect(s) with a non-local target`);
    }
    redirectCache.rows = usable;
  } catch (error) {
    // Keep serving the previous snapshot, but say so: a silent catch here is
    // how an operator ends up staring at stale 301s with no clue why.
    console.error(`> redirect refresh failed, serving previous snapshot: ${String(error)}`);
  }
}

async function readRedirectSnapshot() {
  try {
    const contents = await readFile(path.join(process.cwd(), "data", "seo-redirects.json"), "utf8");
    const redirects = JSON.parse(contents);
    if (!Array.isArray(redirects)) throw new Error("redirect snapshot is not an array");
    return redirects.map((redirect) => ({
      from_path: redirect.fromPath,
      to_path: redirect.toPath,
      status_code: redirect.statusCode,
    }));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

/* --------------------------------------------------------------- http layer */

let handleRequest = null;
const httpServer = createServer((request, response) => {
  if (!handleRequest) {
    response.writeHead(503).end("Server is starting");
    return;
  }
  void refreshRedirects();
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const match =
      request.method === "GET" ? redirectCache.rows.find((r) => r.from_path === url.pathname) : null;
    if (match) {
      const status = match.status_code === 308 ? 308 : 301;
      response.writeHead(status, { Location: match.to_path, "Cache-Control": "public, max-age=300" });
      response.end();
      return;
    }
  } catch {
    /* fall through to Next */
  }
  void handleRequest(request, response);
});

const app = next({ dev, hostname, port, httpServer });
handleRequest = app.getRequestHandler();
await app.prepare();

/* -------------------------------------------------------------- lifecycle */

// A bind failure (port already taken, bad HOSTNAME) must be a clear startup
// error. Without this handler Node reports an opaque throw and the platform
// just restart-loops.
httpServer.on("error", (error) => {
  console.error(`FATAL: could not listen on ${hostname}:${port} — ${String(error)}`);
  process.exit(1);
});

httpServer.listen(port, hostname, () => {
  console.log(`> Next.js ready on http://${hostname}:${port}`);
});

// Log and exit non-zero so the platform restarts the process. Continuing after
// an unhandled rejection means serving requests from a corrupted state.
process.on("unhandledRejection", (reason) => {
  console.error(`FATAL: unhandled rejection — ${String(reason)}`);
  process.exit(1);
});
process.on("uncaughtException", (error) => {
  console.error(`FATAL: uncaught exception — ${String(error)}`);
  process.exit(1);
});

let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`> ${signal} received, closing`);

  httpServer.close(() => {
    // `sql` is null in dev without DATABASE_URL; dereferencing it would turn a
    // clean shutdown into a crash on the way out.
    const done = sql ? sql.end({ timeout: 5 }) : Promise.resolve();
    done.catch(() => undefined).finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
