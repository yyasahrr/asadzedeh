import type { Metadata } from "next";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { adminOverview } from "@/lib/data";
import { getOrders } from "@/lib/store";
import { formatPrice, toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "مدیریت" };

const days = ["شنبه", "۱شنبه", "۲شنبه", "۳شنبه", "۴شنبه", "۵شنبه", "جمعه"];

export default function AdminPage() {
  const max = Math.max(...adminOverview.weeklySales);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">نمای کلی</h1>
        <p className="text-sm text-ink-500">آخرین به‌روزرسانی: امروز، ۹:۳۰ صبح</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {adminOverview.kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
            <p className="text-[13px] font-bold text-ink-500">{k.label}</p>
            <p className="mt-1.5 text-2xl font-black text-navy-900">{k.value}</p>
            <p className={`mt-1.5 flex items-center gap-1 text-xs font-bold ${k.up ? "text-teal-700" : "text-ochre-700"}`}>
              {k.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {k.delta}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5" aria-label="فروش هفتگی">
        <h2 className="font-extrabold text-navy-900">فروش ۷ روز اخیر (میلیون تومان)</h2>
        <div className="mt-5 flex h-44 items-end gap-2 sm:gap-3" role="img" aria-label="نمودار فروش هفتگی">
          {adminOverview.weeklySales.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-ink-500">{toFa(v)}</span>
              <div className="flex w-full flex-1 items-end rounded-lg bg-sand-100">
                <div
                  className="w-full rounded-lg bg-navy-800 transition-all"
                  style={{ height: `${Math.round((v / max) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-ink-500">{days[i]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent orders */}
      <section aria-label="سفارش‌های اخیر">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold text-navy-900">سفارش‌های اخیر</h2>
          <Link href="/admin/orders" className="text-[13px] font-bold text-teal-600 hover:text-teal-700">همه سفارش‌ها ←</Link>
        </div>
        <TableShell head={["شماره", "هنرجو", "دوره", "مبلغ", "وضعیت"]}>
          {getOrders().slice(0, 5).map((o) => (
            <tr key={o.id} className="transition-colors hover:bg-sand-50">
              <Td className="font-bold text-navy-800" ><span dir="ltr">{o.id}</span></Td>
              <Td className="font-semibold">{o.student}</Td>
              <Td className="text-ink-600">{o.item}</Td>
              <Td className="font-bold whitespace-nowrap">{formatPrice(o.amount)}</Td>
              <Td><StatusBadge status={o.status} /></Td>
            </tr>
          ))}
        </TableShell>
      </section>
    </div>
  );
}
