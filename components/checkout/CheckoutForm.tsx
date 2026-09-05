"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Package, Store, Truck, TriangleAlert } from "lucide-react";
import { cartTotal, couponDiscount, getCart, hasPhysical, itemQty, type CartItem } from "@/lib/cart";
import { formatPrice, toFa } from "@/lib/format";
import type { ShippingMethod } from "@/lib/types";
import { FieldLabel, Input, Textarea } from "../ui/Input";
import { startCheckout } from "@/app/checkout/actions";

export function CheckoutForm({
  userName,
  userPhone,
  shippingMethods,
  freeShippingOver,
  error,
}: {
  userName: string;
  userPhone: string;
  shippingMethods: ShippingMethod[];
  freeShippingOver: number;
  error?: string;
}) {
  const [items, setItems] = useState<CartItem[] | null>(() => {
    if (typeof window === "undefined") return null;
    return getCart();
  });
  const [coupon, setCoupon] = useState("");
  const [method, setMethod] = useState(shippingMethods[0]?.id ?? "");

  useEffect(() => {
    const onChange = () => setItems(getCart());
    window.addEventListener("az:cart", onChange);
    return () => window.removeEventListener("az:cart", onChange);
  }, []);

  const physical = useMemo(() => (items ? hasPhysical(items) : false), [items]);
  const total = items ? cartTotal(items) : 0;
  const discount = couponDiscount(total, coupon);
  const chosen = shippingMethods.find((m) => m.id === method);
  const shippingCost = (() => {
    if (!physical || !chosen) return 0;
    const threshold = chosen.freeOver || freeShippingOver;
    return threshold > 0 && total - discount >= threshold ? 0 : chosen.cost;
  })();
  const payable = Math.max(0, total - discount + shippingCost);

  if (items === null) {
    return <div className="rounded-2xl bg-card p-10 text-center shadow-card">در حال بارگذاری…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-10 text-center shadow-card">
        <p className="font-extrabold text-navy-900">سبد خرید خالی است.</p>
        <Link href="/courses" className="mt-3 inline-block text-sm font-bold text-teal-600 hover:underline">
          بازگشت به دوره‌ها ←
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form action={startCheckout} className="space-y-6 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <input type="hidden" name="items" value={JSON.stringify(items)} />

        {error && (
          <p className="flex items-center gap-2 rounded-xl bg-madder-50 px-4 py-3 text-sm font-bold text-madder-700">
            <TriangleAlert className="h-4 w-4" /> {error}
          </p>
        )}

        <section className="space-y-4">
          <h2 className="font-black text-navy-900">مشخصات خریدار</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="co-name">نام و نام خانوادگی *</FieldLabel>
              <Input id="co-name" name="name" required defaultValue={userName} placeholder="مثلاً سارا محمدی" />
            </div>
            <div>
              <FieldLabel htmlFor="co-phone">شماره موبایل *</FieldLabel>
              <Input id="co-phone" name="phone" required inputMode="tel" defaultValue={userPhone} dir="ltr" className="text-left" placeholder="09123456789" />
            </div>
          </div>
        </section>

        {physical && (
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 font-black text-navy-900"><Truck className="h-5 w-5 text-teal-700" /> ارسال کالا</h2>
            <div className="grid gap-2">
              {shippingMethods.map((m) => {
                const threshold = m.freeOver || freeShippingOver;
                const free = threshold > 0 && total - discount >= threshold;
                return (
                  <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${method === m.id ? "border-teal-600 bg-teal-50/60" : "border-ink-900/10 hover:bg-sand-50"}`}>
                    <input type="radio" name="shippingMethod" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="h-4 w-4 accent-teal-700" />
                    {m.id === "pickup" ? <Store className="h-4 w-4 text-ink-500" /> : <Package className="h-4 w-4 text-ink-500" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink-900">{m.label}</span>
                      <span className="block text-xs text-ink-500">{m.description} • {m.etaDays}</span>
                    </span>
                    <span className="text-sm font-bold text-navy-900 whitespace-nowrap">{free || m.cost === 0 ? "رایگان" : formatPrice(m.cost)}</span>
                  </label>
                );
              })}
            </div>
            {method !== "pickup" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="co-recipient">نام گیرنده</FieldLabel>
                  <Input id="co-recipient" name="recipient" defaultValue={userName} placeholder="اگر با خریدار متفاوت است" />
                </div>
                <div>
                  <FieldLabel htmlFor="co-province">استان *</FieldLabel>
                  <Input id="co-province" name="province" required placeholder="مثلاً تهران" />
                </div>
                <div>
                  <FieldLabel htmlFor="co-city">شهر *</FieldLabel>
                  <Input id="co-city" name="city" required placeholder="مثلاً تهران" />
                </div>
                <div>
                  <FieldLabel htmlFor="co-postal">کد پستی</FieldLabel>
                  <Input id="co-postal" name="postalCode" inputMode="numeric" dir="ltr" className="text-left" placeholder="۱۰ رقم" />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="co-address">آدرس کامل *</FieldLabel>
                  <Textarea id="co-address" name="address" required className="min-h-20" placeholder="خیابان، کوچه، پلاک، واحد" />
                </div>
              </div>
            )}
            {method === "pickup" && (
              <p className="rounded-xl bg-sand-50 px-4 py-3 text-xs leading-6 text-ink-600">
                پس از ثبت سفارش، پیامک آماده‌بودن کالا برایتان ارسال می‌شود. آدرس کارگاه: تهران، بازار فرش، سرای اسدزاده.
              </p>
            )}
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="co-coupon">کد تخفیف (اختیاری)</FieldLabel>
            <Input id="co-coupon" name="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} dir="ltr" className="text-left" placeholder="ASAD10" />
          </div>
          <div>
            <FieldLabel htmlFor="co-note">یادداشت سفارش (اختیاری)</FieldLabel>
            <Input id="co-note" name="note" placeholder="مثلاً: زنگ نزنید، تماس بگیرید" />
          </div>
        </section>

        <button type="submit" className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-xl bg-madder-700 font-bold text-white transition-colors hover:bg-madder-600">
          پرداخت {formatPrice(payable)}
        </button>
        <p className="text-center text-xs leading-6 text-ink-500">
          با پرداخت، قوانین و مقررات اسدزاده را می‌پذیرید.
        </p>
      </form>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="font-black text-navy-900">اقلام سفارش ({toFa(items.length)})</h2>
          <ul className="mt-4 space-y-3">
            {items.map((i) => (
              <li key={i.slug} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-ink-700">
                  {i.title}
                  {itemQty(i) > 1 && <span className="ms-1 text-xs text-ink-500">×{toFa(itemQty(i))}</span>}
                </span>
                <span className="font-bold whitespace-nowrap text-navy-900">{formatPrice(i.price * itemQty(i))}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-dashed border-ink-900/10 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-600">جمع</dt><dd className="font-bold">{formatPrice(total)}</dd></div>
            {discount > 0 && (
              <div className="flex justify-between text-teal-700"><dt>تخفیف</dt><dd className="font-bold">− {formatPrice(discount)}</dd></div>
            )}
            {physical && (
              <div className="flex justify-between"><dt className="text-ink-600">هزینه ارسال</dt><dd className="font-bold">{shippingCost === 0 ? "رایگان" : formatPrice(shippingCost)}</dd></div>
            )}
            <div className="flex justify-between text-base"><dt className="font-extrabold text-navy-900">قابل پرداخت</dt><dd className="font-black text-navy-900">{formatPrice(payable)}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
