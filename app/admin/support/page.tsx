import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getTickets } from "@/lib/store";
import { toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { Denied } from "@/components/admin/Denied";
import { can, getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "تیکت‌های پشتیبانی" };
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

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !can(user, "support")) return <Denied />;

  const { status = "all" } = await searchParams;
  const tickets = getTickets();

  const filtered = status === "all" ? tickets : tickets.filter((t) => t.status === status);

  const openCount = tickets.filter((t) => t.status === "باز" || t.status === "در حال بررسی").length;

  const statusFilters = [
    { key: "all", label: "همه", count: tickets.length },
    { key: "باز", label: "باز", count: tickets.filter((t) => t.status === "باز").length },
    { key: "در حال بررسی", label: "در حال بررسی", count: tickets.filter((t) => t.status === "در حال بررسی").length },
    { key: "پاسخ داده شده", label: "پاسخ داده شده", count: tickets.filter((t) => t.status === "پاسخ داده شده").length },
    { key: "بسته شده", label: "بسته شده", count: tickets.filter((t) => t.status === "بسته شده").length },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">تیکت‌های پشتیبانی</h1>
        {openCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-madder-50 px-3 py-1.5 text-xs font-bold text-madder-700">
            <MessageCircle className="h-3.5 w-3.5" /> {toFa(openCount)} تیکت پاسخ‌داده‌نشده
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/support" : `/admin/support?status=${encodeURIComponent(f.key)}`}
            aria-current={status === f.key ? "true" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-bold transition-colors",
              status === f.key ? "bg-navy-800 text-white" : "bg-card text-ink-600 shadow-card ring-1 ring-ink-900/5 hover:bg-sand-100"
            )}
          >
            {f.label} ({toFa(f.count)})
          </Link>
        ))}
      </div>

      <TableShell head={["موضوع", "دانشجو", "دسته", "اولویت", "پیام‌ها", "وضعیت", "تاریخ"]}>
        {filtered.map((t) => (
          <tr key={t.id} className="transition-colors hover:bg-sand-50">
            <Td>
              <Link href={`/admin/support/${t.id}`} className="font-bold text-navy-900 hover:text-teal-700 hover:underline">
                {t.subject}
              </Link>
              <p className="text-[11px] text-ink-400" dir="ltr">{t.id}</p>
            </Td>
            <Td className="font-semibold">{t.student}</Td>
            <Td>
              <span className="rounded bg-sand-100 px-2 py-0.5 text-[11px] font-bold text-ink-600">{t.category}</span>
            </Td>
            <Td>
              <span className={cn("rounded px-2 py-0.5 text-[11px] font-bold", priorityColors[t.priority] ?? "")}>{t.priority}</span>
            </Td>
            <Td className="font-bold">{toFa(t.messages.length)}</Td>
            <Td>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", statusColors[t.status] ?? "")}>{t.status}</span>
            </Td>
            <Td className="whitespace-nowrap text-xs text-ink-600">
              {new Date(t.createdAt).toLocaleDateString("fa-IR")}
            </Td>
          </tr>
        ))}
      </TableShell>

      {filtered.length === 0 && (
        <p className="rounded-2xl bg-card p-8 text-center text-sm text-ink-500 shadow-card">تیکتی با این فیلتر نیست.</p>
      )}
    </div>
  );
}
