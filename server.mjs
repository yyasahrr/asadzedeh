import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import next from "next";
import postgres from "postgres";
import { Server } from "socket.io";

const SESSION_COOKIE = "az_session";
const SUPPORT_ROLES = new Set(["super_admin", "admin", "manager", "support"]);
const TICKET_STATUSES = new Set(["باز", "در حال بررسی", "پاسخ داده شده", "بسته شده"]);
const dev = process.argv.includes("--dev");
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is required — the realtime layer reads and writes PostgreSQL directly.");
  process.exit(1);
}

/**
 * The socket layer talks to the same PostgreSQL the app uses. It must not keep a
 * private copy of tickets or sessions on disk: two writers on one file is how
 * chat history gets lost.
 */
const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  onnotice: () => {},
});

/* ------------------------------------------------------------------ support */

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

async function authenticate(cookieHeader) {
  const token = readCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;
  const rows = await sql`
    SELECT u.id, u.name, u.phone, u.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
     WHERE s.token = ${token}
       AND s.revoked_at IS NULL
       AND s.expires_at IS NOT NULL
       AND s.expires_at > now()
     LIMIT 1`;
  return rows[0] ?? null;
}

async function getTicket(ticketId) {
  const rows = await sql`SELECT payload FROM tickets WHERE id = ${ticketId} LIMIT 1`;
  return rows[0]?.payload ?? null;
}

/**
 * Append one message and update the status in a single statement, so two
 * simultaneous replies cannot overwrite each other.
 */
async function appendTicketMessage(ticketId, message, status) {
  const rows = await sql`
    UPDATE tickets
       SET payload = jsonb_set(
             jsonb_set(
               payload,
               '{messages}',
               COALESCE(payload->'messages', '[]'::jsonb) || ${sql.json(message)}::jsonb,
               true
             ),
             '{updatedAt}',
             to_jsonb(${message.createdAt}::text),
             true
           ),
           status = ${status},
           updated_at = now()
     WHERE id = ${ticketId}
     RETURNING payload`;
  const payload = rows[0]?.payload;
  if (!payload) return null;
  return { ...payload, status, updatedAt: message.createdAt };
}

/** Tickets written by the legacy JSON store may hold nested message arrays. */
function flattenMessages(payload) {
  const raw = payload?.messages;
  const list = Array.isArray(raw) ? raw : [];
  return list.flat(Infinity).filter((m) => m && typeof m === "object" && m.id);
}

async function createTicket(ticket) {
  await sql`
    INSERT INTO tickets (id, status, payload)
    VALUES (${ticket.id}, ${ticket.status}, ${sql.json(ticket)})`;
  return ticket;
}

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

/* ---------------------------------------------------------------- socket.io */

const io = new Server(httpServer, {
  path: "/socket.io",
  serveClient: false,
  cors: { origin: false },
  maxHttpBufferSize: 10_000,
  allowRequest: (request, callback) => {
    const origin = request.headers.origin;
    if (!origin) return callback(null, dev);
    try {
      callback(null, new URL(origin).host === request.headers.host);
    } catch {
      callback(null, false);
    }
  },
});

io.use((socket, nextMiddleware) => {
  authenticate(socket.request.headers.cookie)
    .then((user) => {
      if (!user) return nextMiddleware(new Error("unauthorized"));
      socket.data.user = user;
      nextMiddleware();
    })
    .catch(() => nextMiddleware(new Error("authentication failed")));
});

io.on("connection", (socket) => {
  const user = socket.data.user;
  const isSupport = SUPPORT_ROLES.has(user.role);
  if (isSupport) void socket.join("support:staff");
  const recentMessages = [];

  const reply = (ack, value) => {
    if (typeof ack === "function") ack(value);
  };

  const isRateLimited = () => {
    const cutoff = Date.now() - 60_000;
    while (recentMessages[0] < cutoff) recentMessages.shift();
    if (recentMessages.length >= 20) return true;
    recentMessages.push(Date.now());
    return false;
  };

  socket.on("ticket:join", (ticketId, ack) => {
    void (async () => {
      try {
        const ticket = typeof ticketId === "string" ? await getTicket(ticketId) : null;
        if (!ticket || (!isSupport && ticket.userId !== user.id)) {
          reply(ack, { ok: false, error: "forbidden" });
          return;
        }
        await socket.join(`ticket:${ticket.id}`);
        reply(ack, { ok: true, data: { messages: flattenMessages(ticket) } });
      } catch {
        reply(ack, { ok: false, error: "unavailable" });
      }
    })();
  });

  socket.on("ticket:create", (rawText, ack) => {
    const text = typeof rawText === "string" ? rawText.trim().slice(0, 2000) : "";
    if (!text || isSupport) {
      reply(ack, { ok: false, error: text ? "forbidden" : "text required" });
      return;
    }
    if (isRateLimited()) {
      reply(ack, { ok: false, error: "rate limited" });
      return;
    }

    void (async () => {
      try {
        const now = new Date().toISOString();
        const message = { id: randomUUID(), sender: user.name, senderRole: "student", text, createdAt: now };
        const ticket = {
          id: randomUUID(),
          subject: "پشتیبانی آنلاین",
          student: user.name,
          userId: user.id,
          phone: user.phone,
          status: "باز",
          priority: "عادی",
          category: "عمومی",
          messages: [message],
          createdAt: now,
          updatedAt: now,
        };
        await createTicket(ticket);
        await socket.join(`ticket:${ticket.id}`);
        io.to("support:staff").emit("ticket:created", ticket);
        reply(ack, { ok: true, data: { ticketId: ticket.id, messages: ticket.messages } });
      } catch {
        reply(ack, { ok: false, error: "unavailable" });
      }
    })();
  });

  socket.on("ticket:message", (payload, ack) => {
    const ticketId = typeof payload?.ticketId === "string" ? payload.ticketId : "";
    const text = typeof payload?.text === "string" ? payload.text.trim().slice(0, 2000) : "";
    const requestedStatus = typeof payload?.status === "string" ? payload.status : "";

    void (async () => {
      try {
        const ticket = ticketId ? await getTicket(ticketId) : null;
        if (!ticket || !text || (isSupport ? ticket.status === "بسته شده" : ticket.userId !== user.id)) {
          reply(ack, { ok: false, error: !text ? "text required" : "forbidden" });
          return;
        }
        if (isRateLimited()) {
          reply(ack, { ok: false, error: "rate limited" });
          return;
        }

        const message = {
          id: randomUUID(),
          sender: user.name,
          senderRole: isSupport ? "admin" : "student",
          text,
          createdAt: new Date().toISOString(),
        };
        const status = isSupport
          ? TICKET_STATUSES.has(requestedStatus)
            ? requestedStatus
            : "پاسخ داده شده"
          : ticket.status === "بسته شده"
            ? "باز"
            : ticket.status;

        const updated = await appendTicketMessage(ticketId, message, status);
        if (!updated) {
          reply(ack, { ok: false, error: "not found" });
          return;
        }
        const messages = flattenMessages(updated);
        io.to(`ticket:${ticketId}`).emit("ticket:messages", messages);
        io.to("support:staff").emit("ticket:updated", { ...updated, messages });
        reply(ack, { ok: true, data: { messages } });
      } catch {
        reply(ack, { ok: false, error: "unavailable" });
      }
    })();
  });
});

/* -------------------------------------------------------------- lifecycle */

httpServer.listen(port, hostname, () => {
  console.log(`> Next.js + Socket.IO ready on http://${hostname}:${port}`);
});

let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`> ${signal} received, closing`);

  // Give the socket layer a moment to flush, then stop accepting everything.
  io.close(() => {
    httpServer.close(() => {
      sql.end({ timeout: 5 }).finally(() => process.exit(0));
    });
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
