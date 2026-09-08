import { Send } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { replyTicket } from "@/app/support/actions";

/**
 * Student view of a ticket thread.
 *
 * Server-rendered: messages come from the page's data fetch and replies go
 * through a server action. There is no realtime channel — the page revalidates
 * after each reply, which is enough for a ticket queue.
 */
export function TicketMessages({ ticket }: { ticket: Ticket }) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {ticket.messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-2xl p-4 ring-1 ring-ink-900/5 ${
              msg.senderRole === "admin" ? "mr-8 bg-teal-50" : "ml-8 bg-card"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                  msg.senderRole === "admin" ? "bg-teal-600" : "bg-navy-800"
                }`}
              >
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

      {ticket.status !== "بسته شده" ? (
        <form action={replyTicket} className="flex flex-wrap gap-2 rounded-2xl bg-card p-3 ring-1 ring-ink-900/5">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <label htmlFor="ticket-reply" className="sr-only">
            پاسخ
          </label>
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
            className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-bold text-white transition-colors hover:bg-teal-700"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <p className="rounded-xl bg-ink-50 p-3 text-center text-sm text-ink-500">این تیکت بسته شده است.</p>
      )}
    </div>
  );
}
