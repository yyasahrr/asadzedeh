import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { getOrders } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";
import { dashboardStudent } from "@/lib/data";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "سفارش‌ها" };

export default async function OrdersPage() {
  const user = await getSessionUser();
  const name = user?.name ?? dashboardStudent.name;
  const orders = getOrders().filter((o) => o.student === name || o.student.startsWith(`${name} (`));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">سفارش‌ها</h1>
      {orders.length === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center shadow-card">
          <p className="font-extrabold text-navy-900">هنوز سفارشی ثبت نکرده‌اید.</p>
          <Link href="/courses" className="mt-3 inline-block text-sm font-bold text-teal-600 hover:underline">
            مشاهده دوره‌ها ←
          </Link>
        </div>
      ) : (
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
                  <td className="max-w-64 truncate px-5 py-4 font-semibold">{o.item}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-ink-600">{o.date ?? "—"}</td>
                  <td className="px-5 py-4 font-bold whitespace-nowrap">{formatPrice(o.amount)}</td>
                  <td className="px-5 py-4"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
