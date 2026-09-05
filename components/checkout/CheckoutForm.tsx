"use client";

import { useState } from "react";
import Link from "next/link";
import { cartTotal, couponDiscount, getCart, type CartItem } from "@/lib/cart";
import { formatPrice, toFa } from "@/lib/format";
import { FieldLabel, Input } from "../ui/Input";
import { startCheckout } from "@/app/checkout/actions";

export function CheckoutForm({ userName, userPhone }: { userName: string; userPhone: string }) {
  const [items] = useState<CartItem[] | null>(() => {
    if (typeof window === "undefined") return null;
    return getCart();
  });
  const [coupon, setCoupon] = useState("");

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

  const total = cartTotal(items);
  const discount = couponDiscount(total, coupon);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form action={startCheckout} className="space-y-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <input type="hidden" name="items" value={JSON.stringify(items)} />
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
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="co-coupon">کد تخفیف (اختیاری)</FieldLabel>
            <Input id="co-coupon" name="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} dir="ltr" className="text-left" placeholder="ASAD10" />
          </div>
        </div>
        <button type="submit" className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-xl bg-madder-700 font-bold text-white transition-colors hover:bg-madder-600">
          پرداخت {formatPrice(total - discount)}
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
                <span className="font-semibold text-ink-700">{i.title}</span>
                <span className="font-bold whitespace-nowrap text-navy-900">{formatPrice(i.price)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-dashed border-ink-900/10 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-600">جمع</dt><dd className="font-bold">{formatPrice(total)}</dd></div>
            {discount > 0 && (
              <div className="flex justify-between text-teal-700"><dt>تخفیف</dt><dd className="font-bold">− {formatPrice(discount)}</dd></div>
            )}
            <div className="flex justify-between text-base"><dt className="font-extrabold text-navy-900">قابل پرداخت</dt><dd className="font-black text-navy-900">{formatPrice(total - discount)}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
