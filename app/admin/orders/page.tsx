import type { Metadata } from "next";
import Link from "next/link";
import { adminOverview } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "سفارش‌ها" };

const filters = ["همه", "پرداخت شده", "در انتظار پرداخت", "لغو شده"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "همه" } = await searchParams;
  const filtered = adminOverview.recentOrders.filter((o) => status === "همه" || o.status === status);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">سفارش‌ها</h1>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "همه" ? "/admin/orders" : `/admin/orders?status=${encodeURIComponent(f)}`}
            aria-current={status === f ? "true" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-bold transition-colors",
              status === f ? "bg-navy-800 text-white" : "bg-card text-ink-600 shadow-card ring-1 ring-ink-900/5 hover:bg-sand-100"
            )}
          >
            {f}
          </Link>
        ))}
      </div>
      <TableShell head={["شماره", "هنرجو", "دوره", "مبلغ", "وضعیت"]}>
        {filtered.map((o) => (
          <tr key={o.id} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-800"><span dir="ltr">{o.id}</span></Td>
            <Td className="font-semibold">{o.student}</Td>
            <Td className="text-ink-600">{o.item}</Td>
            <Td className="font-bold whitespace-nowrap">{formatPrice(o.amount)}</Td>
            <Td><StatusBadge status={o.status} /></Td>
          </tr>
        ))}
      </TableShell>
      {filtered.length === 0 && (
        <p className="rounded-2xl bg-card p-8 text-center text-sm text-ink-500 shadow-card">سفارشی با این وضعیت نیست.</p>
      )}
    </div>
  );
}
