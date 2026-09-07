"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { io, type Socket } from "socket.io-client";

export function TicketMessages({ ticket }: { ticket: Ticket }) {
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
            const text = new FormData(form).get("text")?.toString().trim();
            if (!socket?.connected || !text || pending) return;
            setPending(true);
            setError("");
            socket.timeout(8000).emit("ticket:message", { ticketId: ticket.id, text }, (timeoutError: Error | null, result: { ok: boolean; data?: { messages: Ticket["messages"] } }) => {
              setPending(false);
              if (timeoutError || !result?.ok) {
                setError("ارسال پیام ناموفق بود.");
                return;
              }
              setMessages(result.data?.messages ?? []);
              form.reset();
            });
          }}
          className="flex flex-wrap gap-2 rounded-2xl bg-card p-3 ring-1 ring-ink-900/5"
        >
          {!connected && <p className="w-full text-xs font-bold text-ochre-800">در حال اتصال به چت زنده…</p>}
          {error && <p role="alert" className="w-full text-xs font-bold text-madder-700">{error}</p>}
          <label htmlFor="ticket-reply" className="sr-only">پاسخ</label>
          <input
            id="ticket-reply"
            name="text"
            required
            maxLength={2000}
            placeholder="پیام خود را بنویسید..."
            className="min-h-11 flex-1 rounded-xl border border-ink-900/10 bg-white px-4 text-sm focus:border-teal-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !connected}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}

      {ticket.status === "بسته شده" && (
        <p className="rounded-xl bg-ink-50 p-3 text-center text-sm text-ink-500">این تیکت بسته شده است.</p>
      )}
    </div>
  );
}
