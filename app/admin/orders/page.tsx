import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { getOrders } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { updateOrderStatus } from "../actions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "سفارش‌ها" };

const filters = ["همه", "پرداخت شده", "در انتظار پرداخت", "لغو شده"];
const statuses = ["پرداخت شده", "در انتظار پرداخت", "لغو شده"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "همه" } = await searchParams;
  const filtered = getOrders().filter((o) => status === "همه" || o.status === status);

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
      <TableShell head={["شماره", "هنرجو", "دوره", "مبلغ", "وضعیت", "تغییر وضعیت"]}>
        {filtered.map((o) => (
          <tr key={o.id} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-800"><span dir="ltr">{o.id}</span></Td>
            <Td className="font-semibold">{o.student}</Td>
            <Td className="text-ink-600">{o.item}</Td>
            <Td className="font-bold whitespace-nowrap">{formatPrice(o.amount)}</Td>
            <Td><StatusBadge status={o.status} /></Td>
            <Td>
              <form action={updateOrderStatus} className="flex items-center gap-1.5">
                <input type="hidden" name="id" value={o.id} />
                <label htmlFor={`st-${o.id}`} className="sr-only">وضعیت سفارش {o.id}</label>
                <select
                  id={`st-${o.id}`}
                  name="status"
                  defaultValue={o.status}
                  className="h-9 cursor-pointer rounded-lg border border-ink-900/10 bg-white px-2 text-[13px] font-bold text-ink-700 focus:border-teal-600 focus:outline-none"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  aria-label="ثبت وضعیت"
                  title="ثبت وضعیت"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-teal-600 text-white transition-colors hover:bg-teal-700"
                >
                  <Check className="h-4 w-4" />
                </button>
              </form>
            </Td>
          </tr>
        ))}
      </TableShell>
      {filtered.length === 0 && (
        <p className="rounded-2xl bg-card p-8 text-center text-sm text-ink-500 shadow-card">سفارشی با این وضعیت نیست.</p>
      )}
    </div>
  );
}
