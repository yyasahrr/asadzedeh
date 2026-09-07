import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getTicket } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { AdminTicketDetail } from "@/components/support/AdminTicketDetail";

export const metadata: Metadata = { title: "جزئیات تیکت" };
export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  "باز": "bg-teal-100 text-teal-800",
  "در حال بررسی": "bg-ochre-100 text-ochre-800",
  "پاسخ داده شده": "bg-navy-50 text-navy-800",
  "بسته شده": "bg-ink-100 text-ink-500",
};

const priorityColors: Record<string, string> = {
  "عادی": "bg-sand-100 text-ink-600",
  "مهم": "bg-ochre-100 text-ochre-800",
  "فوری": "bg-madder-50 text-madder-700",
};

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !can(user, "support")) redirect("/admin");

  const { id } = await params;
  const ticket = getTicket(id);
  if (!ticket) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin/support" className="inline-flex items-center gap-1 text-xs font-bold text-ink-500 hover:text-teal-700">
        <ArrowRight className="h-3.5 w-3.5" /> بازگشت به تیکت‌ها
      </Link>

      <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-black text-navy-900">{ticket.subject}</h1>
           <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", statusColors[ticket.status] ?? "")}>{ticket.status}</span>
           <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", priorityColors[ticket.priority] ?? "")}>{ticket.priority}</span>
          <span className="rounded bg-sand-100 px-2 py-0.5 text-[11px] font-bold text-ink-600">{ticket.category}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
          <span>دانشجو: <strong className="text-navy-900">{ticket.student}</strong></span>
          {ticket.phone && <span dir="ltr">موبایل: {ticket.phone}</span>}
          <span>ایجاد: {new Date(ticket.createdAt).toLocaleDateString("fa-IR")}</span>
          <span dir="ltr">شناسه: {ticket.id}</span>
        </div>
      </div>

      <AdminTicketDetail ticket={ticket} />
    </div>
  );
}
