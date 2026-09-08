import { Send } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { adminReplyTicket } from "@/app/support/actions";

/** Staff view of a ticket thread — server-rendered, replies via server action. */
export function AdminTicketDetail({ ticket }: { ticket: Ticket }) {
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

      {ticket.status !== "بسته شده" && (
        <form action={adminReplyTicket} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-ink-900/5">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <div>
            <label htmlFor="admin-reply" className="mb-1 block text-sm font-bold text-navy-900">
              پاسخ
            </label>
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
              <label htmlFor="admin-ticket-status" className="mr-2 text-xs font-bold text-ink-500">
                تغییر وضعیت:
              </label>
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
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-6 text-sm font-bold text-white transition-colors hover:bg-teal-700"
            >
              <Send className="h-4 w-4" /> ارسال پاسخ
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
