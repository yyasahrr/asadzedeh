import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import next from "next";
import { Server } from "socket.io";

const SESSION_COOKIE = "az_session";
const DB_PATH = path.join(process.cwd(), "data", "db.json");
const SUPPORT_ROLES = new Set(["admin", "manager", "support"]);
const TICKET_STATUSES = new Set(["باز", "در حال بررسی", "پاسخ داده شده", "بسته شده"]);
const dev = process.argv.includes("--dev");
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  const temporaryPath = `${DB_PATH}.${process.pid}.socket.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(temporaryPath, DB_PATH);
}

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

function authenticate(cookieHeader) {
  const token = readCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;
  const db = readDb();
  const session = db.sessions.find((item) => item.token === token);
  if (!session) return null;
  const user = db.users.find((item) => item.id === session.userId);
  if (!user) return null;
  return { id: user.id, name: user.name, phone: user.phone, role: user.role };
}

function getTicket(ticketId) {
  return readDb().tickets.find((ticket) => ticket.id === ticketId);
}

function saveTicket(ticket) {
  const db = readDb();
  db.tickets = db.tickets.map((item) => (item.id === ticket.id ? ticket : item));
  writeDb(db);
}

let handleRequest = null;
const httpServer = createServer((request, response) => {
  if (!handleRequest) {
    response.writeHead(503).end("Server is starting");
    return;
  }
  void handleRequest(request, response);
});

const app = next({ dev, hostname, port, httpServer });
handleRequest = app.getRequestHandler();
await app.prepare();

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
  try {
    const user = authenticate(socket.request.headers.cookie);
    if (!user) return nextMiddleware(new Error("unauthorized"));
    socket.data.user = user;
    nextMiddleware();
  } catch {
    nextMiddleware(new Error("authentication failed"));
  }
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
    const ticket = typeof ticketId === "string" ? getTicket(ticketId) : undefined;
    if (!ticket || (!isSupport && ticket.userId !== user.id)) {
      reply(ack, { ok: false, error: "forbidden" });
      return;
    }
    void socket.join(`ticket:${ticket.id}`);
    reply(ack, { ok: true, data: { messages: ticket.messages } });
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

    const now = new Date().toISOString();
    const message = { id: randomUUID(), sender: user.name, senderRole: "student", text, createdAt: now };
    const ticket = {
      id: randomUUID(), subject: "پشتیبانی آنلاین", student: user.name,
      userId: user.id, phone: user.phone, status: "باز", priority: "عادی",
      category: "عمومی", messages: [message], createdAt: now, updatedAt: now,
    };
    const db = readDb();
    db.tickets.unshift(ticket);
    writeDb(db);

    void socket.join(`ticket:${ticket.id}`);
    io.to("support:staff").emit("ticket:created", ticket);
    reply(ack, { ok: true, data: { ticketId: ticket.id, messages: ticket.messages } });
  });

  socket.on("ticket:message", (payload, ack) => {
    const ticketId = typeof payload?.ticketId === "string" ? payload.ticketId : "";
    const text = typeof payload?.text === "string" ? payload.text.trim().slice(0, 2000) : "";
    const requestedStatus = typeof payload?.status === "string" ? payload.status : "";
    const ticket = getTicket(ticketId);
    if (!ticket || !text || (isSupport ? ticket.status === "بسته شده" : ticket.userId !== user.id)) {
      reply(ack, { ok: false, error: !text ? "text required" : "forbidden" });
      return;
    }
    if (isRateLimited()) {
      reply(ack, { ok: false, error: "rate limited" });
      return;
    }

    const message = {
      id: randomUUID(), sender: user.name, senderRole: isSupport ? "admin" : "student",
      text, createdAt: new Date().toISOString(),
    };
    ticket.messages.push(message);
    ticket.updatedAt = message.createdAt;
    ticket.status = isSupport
      ? (TICKET_STATUSES.has(requestedStatus) ? requestedStatus : "پاسخ داده شده")
      : ticket.status === "بسته شده" ? "باز" : ticket.status;
    saveTicket(ticket);

    io.to(`ticket:${ticket.id}`).emit("ticket:messages", ticket.messages);
    io.to("support:staff").emit("ticket:updated", ticket);
    reply(ack, { ok: true, data: { messages: ticket.messages } });
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`> Next.js + Socket.IO ready on http://localhost:${port}`);
});
