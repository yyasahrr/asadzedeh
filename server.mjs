import { createServer } from "node:http";
import next from "next";
import postgres from "postgres";

const dev = process.argv.includes("--dev");
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is required — redirects are served from PostgreSQL.");
  process.exit(1);
}

/**
 * PostgreSQL is the only store. The redirect layer below reads it directly so an
 * operator can add a 301 without a rebuild; nothing is cached on disk.
 */
const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  onnotice: () => {},
});

/* ---------------------------------------------------------------- redirects */

let redirectCache = { at: 0, rows: [] };
const REDIRECT_TTL_MS = 30_000;

async function refreshRedirects() {
  if (Date.now() - redirectCache.at < REDIRECT_TTL_MS) return;
  redirectCache.at = Date.now();
  try {
    const rows = await sql`
      SELECT from_path, to_path, status_code FROM seo_redirects WHERE enabled = TRUE`;
    redirectCache.rows = rows.filter((r) => r.from_path && r.to_path);
  } catch {
    /* keep serving the previous snapshot */
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

httpServer.listen(port, hostname, () => {
  console.log(`> Next.js ready on http://${hostname}:${port}`);
});

let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`> ${signal} received, closing`);

  httpServer.close(() => {
    sql.end({ timeout: 5 }).finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
