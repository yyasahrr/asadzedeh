import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Package, Truck } from "lucide-react";
import { formatPrice, toFa } from "@/lib/format";
import { getOrders, getPreorders } from "@/lib/store";
import type { Order } from "@/lib/types";
import { getSessionUser } from "@/lib/auth";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "سفارش‌ها" };
export const dynamic = "force-dynamic";

const kindLabel: Record<string, string> = {
  course: "دوره آنلاین",
  class: "دوره حضوری",
  product: "محصول",
  preorder: "پیش‌سفارش",
};

export default async function OrdersPage() {
  const user = await getSessionUser();
  const orders = user
    ? getOrders().filter((o) => o.userId === user.id || o.phone === user.phone || o.student === user.name)
    : [];
  const preorders = user ? getPreorders().filter((p) => p.userId === user.id || p.phone === user.phone) : [];
  const isPickup = (s: NonNullable<Order["shipping"]>) => s.methodId === "pickup" || s.method.includes("حضوری");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-navy-900">سفارش‌ها</h1>

      {!user && (
        <div className="rounded-2xl bg-card p-10 text-center shadow-card">
          <p className="font-extrabold text-navy-900">برای مشاهده سفارش‌ها وارد حساب شوید.</p>
          <Link href="/auth?next=/dashboard/orders" className="mt-3 inline-block text-sm font-bold text-teal-600 hover:underline">
            ورود / ثبت‌نام ←
          </Link>
        </div>
      )}

      {user && preorders.length > 0 && (
        <section className="space-y-3" aria-label="پیش‌سفارش‌ها">
          <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
            <Package className="h-5 w-5 text-ochre-700" />
            پیش‌سفارش‌های ساخت
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {preorders.map((p) => (
              <article key={p.id} className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-navy-900">{p.productTitle}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      <span dir="ltr">{p.id}</span> • {p.createdAt}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                {Object.keys(p.specs).length > 0 && (
                  <dl className="mt-3 flex flex-wrap gap-2 text-xs">
                    {Object.entries(p.specs).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-sand-100 px-2.5 py-1">
                        <dt className="inline text-ink-500">{k}: </dt>
                        <dd className="inline font-bold text-ink-800">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-sand-50 px-3 py-2">
                    <p className="text-xs text-ink-500">مبلغ برآوردی</p>
                    <p className="font-bold">{p.quotedPrice ? formatPrice(p.quotedPrice) : "پس از بررسی"}</p>
                  </div>
                  <div className="rounded-xl bg-sand-50 px-3 py-2">
                    <p className="text-xs text-ink-500">بیعانه</p>
                    <p className="font-bold">
                      {p.deposit ? formatPrice(p.deposit) : "—"} {p.deposit ? (p.depositPaid ? "✅" : "(پرداخت‌نشده)") : ""}
                    </p>
                  </div>
                </div>
                {p.eta && <p className="mt-2 text-xs text-ink-600">زمان تحویل تقریبی: {p.eta}</p>}
                <Link href={`/shop/preorder?id=${p.id}&phone=${encodeURIComponent(p.phone)}`} className="mt-3 inline-block text-[13px] font-bold text-teal-600 hover:underline">
                  پیگیری مراحل ساخت ←
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {user && orders.length === 0 && (
        <div className="rounded-2xl bg-card p-10 text-center shadow-card">
          <p className="font-extrabold text-navy-900">هنوز سفارشی ثبت نکرده‌اید.</p>
          <div className="mt-3 flex justify-center gap-4 text-sm font-bold text-teal-600">
            <Link href="/courses" className="hover:underline">مشاهده دوره‌ها ←</Link>
            <Link href="/shop" className="hover:underline">فروشگاه ←</Link>
          </div>
        </div>
      )}

      {user && orders.length > 0 && (
        <section className="space-y-3" aria-label="سفارش‌ها">
          {orders.map((o) => {
            const lines = o.lines ?? [];
            const hasShipping = !!o.shipping && !isPickup(o.shipping);
            return (
              <details key={o.id} className="group rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5 open:ring-teal-600/20">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="font-bold text-navy-800" dir="ltr">{o.id}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-800">{o.item}</span>
                  <span className="text-xs whitespace-nowrap text-ink-500">{o.date ?? "—"}</span>
                  <span className="font-bold whitespace-nowrap">{formatPrice(o.amount)}</span>
                  <StatusBadge status={o.status} />
                  <ChevronDown className="h-4 w-4 text-ink-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-ink-900/5 px-5 py-4">
                  {lines.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-right text-xs text-ink-500">
                          <th className="pb-2 font-bold">عنوان</th>
                          <th className="pb-2 font-bold">نوع</th>
                          <th className="pb-2 font-bold">تعداد</th>
                          <th className="pb-2 font-bold">مبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-900/5">
                        {lines.map((l, i) => (
                          <tr key={`${l.slug}-${i}`}>
                            <td className="py-2 font-semibold">
                              {l.kind === "course" && o.status === "پرداخت شده" ? (
                                <Link href={`/dashboard/courses/${l.slug}`} className="text-teal-700 hover:underline">{l.title}</Link>
                              ) : l.kind === "product" ? (
                                <Link href={`/shop/${l.slug}`} className="hover:underline">{l.title}</Link>
                              ) : (
                                l.title
                              )}
                            </td>
                            <td className="py-2 text-ink-600">{kindLabel[l.kind] ?? l.kind}</td>
                            <td className="py-2 text-ink-600">{toFa(l.qty)}</td>
                            <td className="py-2 font-bold whitespace-nowrap">{formatPrice(l.price * l.qty)}</td>
                          </tr>
                        ))}
                        {o.shipping && (
                          <tr>
                            <td className="py-2 text-ink-600" colSpan={3}>هزینه ارسال ({o.shipping.method})</td>
                            <td className="py-2 font-bold whitespace-nowrap">{o.shipping.cost ? formatPrice(o.shipping.cost) : "رایگان"}</td>
                          </tr>
                        )}
                        {o.discount ? (
                          <tr>
                            <td className="py-2 text-ink-600" colSpan={3}>تخفیف</td>
                            <td className="py-2 font-bold whitespace-nowrap text-teal-700">− {formatPrice(o.discount)}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-ink-600">{o.item}</p>
                  )}

                  {hasShipping && o.shipping && (
                    <div className="mt-4 rounded-xl bg-sand-50 p-4 text-sm ring-1 ring-ink-900/5">
                      <p className="flex items-center gap-2 font-bold text-navy-900">
                        <Truck className="h-4 w-4 text-teal-600" />
                        ارسال به: {o.shipping.recipient} — {o.shipping.province}، {o.shipping.city}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-ink-600">
                        {o.shipping.address} • کدپستی <span dir="ltr">{o.shipping.postalCode}</span>
                      </p>
                      {o.shipping.trackingCode ? (
                        <p className="mt-2 text-xs">
                          کد رهگیری پست: <span dir="ltr" className="rounded bg-white px-2 py-0.5 font-mono font-bold text-navy-900">{o.shipping.trackingCode}</span>
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-ink-500">کد رهگیری پس از تحویل به پست در همین‌جا نمایش داده می‌شود.</p>
                      )}
                    </div>
                  )}
                  {o.shipping && isPickup(o.shipping) && (
                    <p className="mt-4 text-xs text-ink-600">تحویل حضوری از کارگاه؛ پس از آماده‌سازی با شما تماس می‌گیریم.</p>
                  )}
                  {o.refId && (
                    <p className="mt-3 text-xs text-ink-500">
                      کد پیگیری پرداخت: <span dir="ltr">{o.refId}</span>
                    </p>
                  )}
                  {o.status === "در انتظار پرداخت" && (
                    <Link href="/checkout" className="mt-3 inline-block rounded-xl bg-navy-800 px-4 py-2 text-xs font-bold text-white hover:bg-navy-700">
                      تکمیل پرداخت
                    </Link>
                  )}
                </div>
              </details>
            );
          })}
        </section>
      )}
    </div>
  );
}
