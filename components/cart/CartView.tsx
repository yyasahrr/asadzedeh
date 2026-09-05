"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import {
  COUPON_CODE,
  cartTotal,
  couponDiscount,
  getCart,
  removeFromCart,
  type CartItem,
} from "@/lib/cart";
import { formatPrice, toFa } from "@/lib/format";

export function CartView() {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");

  useEffect(() => {
    setItems(getCart());
    const onChange = () => setItems(getCart());
    window.addEventListener("az:cart", onChange);
    return () => window.removeEventListener("az:cart", onChange);
  }, []);

  if (items === null) {
    return <div className="rounded-2xl bg-card p-10 text-center shadow-card">در حال بارگذاری سبد…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-16 text-center shadow-card ring-1 ring-ink-900/5">
        <ShoppingBag className="h-12 w-12 text-ink-300" />
        <h2 className="text-xl font-black text-navy-900">سبد خرید خالی است</h2>
        <p className="text-sm text-ink-500">هنوز دوره‌ای انتخاب نکرده‌اید.</p>
        <Link href="/courses" className="mt-2 inline-flex h-11 items-center rounded-xl bg-navy-800 px-8 font-bold text-white">
          مشاهده دوره‌ها
        </Link>
      </div>
    );
  }

  const total = cartTotal(items);
  const discount = couponDiscount(total, applied);
  const badCoupon = applied !== "" && discount === 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {items.map((c) => (
          <article key={c.slug} className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5 sm:flex-row">
            <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl sm:w-52">
              <Image src={c.image} alt={c.title} fill sizes="220px" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col">
              <p className="text-xs font-bold text-teal-600">{c.kind === "course" ? "دوره آنلاین" : "کلاس حضوری"}</p>
              <h2 className="mt-1 leading-8 font-extrabold text-navy-900">{c.title}</h2>
              {c.meta && <p className="mt-1 text-sm text-ink-500">{c.meta}</p>}
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="text-lg font-black text-navy-900">{formatPrice(c.price)}</span>
                <button
                  type="button"
                  onClick={() => setItems(removeFromCart(c.slug))}
                  aria-label={`حذف ${c.title}`}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-madder-700 transition-colors hover:bg-madder-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
        <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700">
          <ArrowRight className="h-4 w-4" />
          ادامه خرید
        </Link>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-2xl bg-card p-6 shadow-lift ring-1 ring-ink-900/5">
          <h2 className="font-black text-navy-900">خلاصه سفارش</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-600">جمع ({toFa(items.length)} مورد)</dt><dd className="font-bold">{formatPrice(total)}</dd></div>
            {discount > 0 && (
              <div className="flex justify-between text-teal-700"><dt>تخفیف ({COUPON_CODE})</dt><dd className="font-bold">− {formatPrice(discount)}</dd></div>
            )}
            <div className="flex justify-between border-t border-dashed border-ink-900/10 pt-3 text-base"><dt className="font-extrabold text-navy-900">مبلغ نهایی</dt><dd className="font-black text-navy-900">{formatPrice(total - discount)}</dd></div>
          </dl>
          <div className="mt-4 flex gap-2">
            <label htmlFor="coupon" className="sr-only">کد تخفیف</label>
            <input
              id="coupon"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="کد تخفیف"
              dir="ltr"
              className="h-11 min-w-0 flex-1 rounded-xl border border-ink-900/10 bg-sand-50 px-4 text-left text-sm focus:border-teal-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setApplied(coupon)}
              className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-800 transition-colors hover:bg-sand-300"
            >
              <BadgePercent className="h-4 w-4" />
              اعمال
            </button>
          </div>
          {badCoupon && <p className="mt-2 text-xs font-bold text-madder-700">کد تخفیف معتبر نیست. (راهنما: {COUPON_CODE} یعنی ۱۰٪ تخفیف)</p>}
          {discount > 0 && <p className="mt-2 text-xs font-bold text-teal-700">کد تخفیف اعمال شد. ✓</p>}
          <Link href="/checkout" className="mt-4 inline-flex h-[52px] w-full items-center justify-center rounded-xl bg-madder-700 font-bold text-white transition-colors hover:bg-madder-600">
            ادامه و پرداخت
          </Link>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            پرداخت امن • ۷ روز ضمانت بازگشت
          </p>
        </div>
      </aside>
    </div>
  );
}
