"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { io, type Socket } from "socket.io-client";

export function AdminTicketDetail({ ticket }: { ticket: Ticket }) {
  const [messages, setMessages] = useState(ticket.messages);
  const [pending, setPending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({ path: "/socket.io", transports: ["websocket"] });
    socketRef.current = socket;
    const join = () => {
      setConnected(true);
      socket.emit("ticket:join", ticket.id, (result: { ok: boolean; data?: { messages: Ticket["messages"] } }) => {
        if (result.ok) setMessages(result.data?.messages ?? []);
      });
    };
    socket.on("connect", join);
    socket.on("disconnect", () => setConnected(false));
    socket.on("ticket:messages", setMessages);
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [ticket.id]);

  return (
    <div className="space-y-4">
      {/* Messages */}
      <div className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-2xl p-4 ring-1 ring-ink-900/5 ${
              msg.senderRole === "admin"
                ? "mr-8 bg-teal-50"
                : "ml-8 bg-card"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                msg.senderRole === "admin" ? "bg-teal-600" : "bg-navy-800"
              }`}>
                {msg.sender.charAt(0)}
              </span>
              <span className="text-sm font-bold text-navy-900">{msg.sender}</span>
              <span className="rounded bg-sand-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                {msg.senderRole === "admin" ? "ادمین" : "دانشجو"}
              </span>
              <span className="text-[11px] text-ink-400">
                {new Date(msg.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                {" • "}
                {new Date(msg.createdAt).toLocaleDateString("fa-IR")}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink-700">{msg.text}</p>
          </div>
        ))}
      </div>

      {/* Reply form */}
      {ticket.status !== "بسته شده" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const socket = socketRef.current;
            const form = event.currentTarget;
            const formData = new FormData(form);
            const text = formData.get("text")?.toString().trim();
            const status = formData.get("status")?.toString();
            if (!socket?.connected || !text || pending) return;
            setPending(true);
            setError("");
            socket.timeout(8000).emit("ticket:message", { ticketId: ticket.id, text, status }, (timeoutError: Error | null, result: { ok: boolean; data?: { messages: Ticket["messages"] } }) => {
              setPending(false);
              if (timeoutError || !result?.ok) {
                setError("ارسال پاسخ ناموفق بود.");
                return;
              }
              setMessages(result.data?.messages ?? []);
              form.reset();
            });
          }}
          className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-ink-900/5"
        >
          {!connected && <p className="text-xs font-bold text-ochre-800">در حال اتصال به چت زنده…</p>}
          {error && <p role="alert" className="text-xs font-bold text-madder-700">{error}</p>}
          <div>
            <label htmlFor="admin-reply" className="mb-1 block text-sm font-bold text-navy-900">پاسخ</label>
            <textarea
              id="admin-reply"
              name="text"
              required
              maxLength={2000}
              rows={4}
              placeholder="پاسخ خود را بنویسید..."
              className="w-full rounded-xl border border-ink-900/10 bg-white px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="admin-ticket-status" className="mr-2 text-xs font-bold text-ink-500">تغییر وضعیت:</label>
              <select
                id="admin-ticket-status"
                name="status"
                defaultValue={ticket.status}
                className="h-9 rounded-lg border border-ink-900/10 bg-white px-2 text-[13px] font-bold text-ink-700 focus:border-teal-600 focus:outline-none"
              >
                <option value="باز">باز</option>
                <option value="در حال بررسی">در حال بررسی</option>
                <option value="پاسخ داده شده">پاسخ داده شده</option>
                <option value="بسته شده">بسته شده</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={pending || !connected}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-6 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> ارسال پاسخ
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
