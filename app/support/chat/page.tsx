"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Headphones, ArrowRight } from "lucide-react";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  sender: string;
  senderRole: "student" | "admin";
  text: string;
  createdAt: string;
}

export default function SupportChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem("support-chat-ticket")
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const socket = io({ path: "/socket.io", transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setError("اتصال زنده برقرار نشد؛ دوباره تلاش می‌کنیم."));
    socket.on("ticket:messages", (nextMessages: ChatMessage[]) => setMessages(nextMessages));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!ticketId || !socket) return;
    const join = () => socket.emit("ticket:join", ticketId, (result: { ok: boolean; data?: { messages: ChatMessage[] } }) => {
      if (result.ok) setMessages(result.data?.messages ?? []);
      else window.localStorage.removeItem("support-chat-ticket");
    });
    if (socket.connected) join();
    socket.on("connect", join);
    return () => { socket.off("connect", join); };
  }, [ticketId]);

  const sendMessage = useCallback(() => {
    const socket = socketRef.current;
    const text = input.trim();
    if (!text || sending || !socket?.connected) return;
    setSending(true);
    setError("");
    const event = ticketId ? "ticket:message" : "ticket:create";
    const payload = ticketId ? { ticketId, text } : text;
    socket.timeout(8000).emit(event, payload, (timeoutError: Error | null, result: { ok: boolean; error?: string; data?: { ticketId?: string; messages: ChatMessage[] } }) => {
      setSending(false);
      if (timeoutError || !result?.ok) {
        setError("ارسال پیام ناموفق بود. لطفاً دوباره تلاش کنید.");
        return;
      }
      if (result.data?.ticketId) {
        setTicketId(result.data.ticketId);
        window.localStorage.setItem("support-chat-ticket", result.data.ticketId);
      }
      setMessages(result.data?.messages ?? []);
      setInput("");
    });
  }, [input, sending, ticketId]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <Link href="/support" className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-ink-500 hover:text-teal-700">
        <ArrowRight className="h-3.5 w-3.5" /> بازگشت
      </Link>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-ink-900/5 bg-gradient-to-l from-teal-600 to-navy-800 px-5 py-4 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <p className="font-black">پشتیبانی آنلاین اسدزاده</p>
            <p className="text-xs text-white/60">
              <span className={`ml-1 inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-300" : "bg-amber-300"}`} />
              {connected ? "متصل — پیام‌ها لحظه‌ای دریافت می‌شوند" : "در حال اتصال مجدد…"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Headphones className="h-12 w-12 text-ink-200" />
              <p className="mt-3 font-extrabold text-navy-900">سلام! چطور می‌توانیم کمک کنیم؟</p>
              <p className="mt-1 text-sm text-ink-500">پیام خود را بنویسید تا تیکت پشتیبانی ایجاد شود.</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderRole === "student" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.senderRole === "admin"
                    ? "bg-teal-50 text-ink-800"
                    : "bg-navy-800 text-white"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-7">{msg.text}</p>
                <p className={`mt-1 text-[10px] ${msg.senderRole === "admin" ? "text-ink-400" : "text-white/50"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-ink-900/5 p-3">
          {error && <p role="alert" className="mb-2 text-xs font-bold text-madder-700">{error}</p>}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="پیام خود را بنویسید..."
              className="min-h-11 flex-1 rounded-xl border border-ink-900/10 bg-white px-4 text-sm focus:border-teal-600 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || !connected}
              className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
