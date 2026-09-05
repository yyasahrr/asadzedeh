import type { Metadata } from "next";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "سفارش‌ها" };

const orders = [
  { id: "AZ-9041", item: "گبه‌بافی (آنلاین)", date: "۲ شهریور ۱۴۰۵", amount: 1750000, status: "پرداخت شده" },
  { id: "AZ-8890", item: "گلیم‌بافی مقدماتی (حضوری)", date: "۱۸ مرداد ۱۴۰۵", amount: 4800000, status: "پرداخت شده" },
  { id: "AZ-8720", item: "رنگرزی سنتی (آنلاین)", date: "۲ تیر ۱۴۰۵", amount: 3200000, status: "پرداخت شده" },
];

export default function OrdersPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">سفارش‌ها</h1>
      <div className="thin-scroll overflow-x-auto rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-ink-900/10 text-right text-xs text-ink-500">
              <th className="px-5 py-3.5 font-bold">شماره</th>
              <th className="px-5 py-3.5 font-bold">دوره</th>
              <th className="px-5 py-3.5 font-bold">تاریخ</th>
              <th className="px-5 py-3.5 font-bold">مبلغ</th>
              <th className="px-5 py-3.5 font-bold">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-900/5">
            {orders.map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-sand-50">
                <td className="px-5 py-4 font-bold text-navy-800" dir="ltr">{o.id}</td>
                <td className="px-5 py-4 font-semibold">{o.item}</td>
                <td className="px-5 py-4 text-ink-600">{o.date}</td>
                <td className="px-5 py-4 font-bold whitespace-nowrap">{formatPrice(o.amount)}</td>
                <td className="px-5 py-4"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
