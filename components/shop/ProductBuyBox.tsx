"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { addToCart } from "@/lib/cart";
import { formatPrice, toFa } from "@/lib/format";
import { availableStock } from "@/lib/stock";
import type { Product } from "@/lib/types";

/** Add-to-cart box for physical products with a quantity stepper and stock awareness. */
export function ProductBuyBox({ product, disabled }: { product: Product; disabled?: boolean }) {
  const p = product;
  const max = availableStock(p);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const out = max <= 0;

  if (out || disabled) {
    return (
      <div className="rounded-2xl bg-sand-100 p-4 text-center text-sm font-bold text-ink-600">
        {disabled ? "فروشگاه موقتاً غیرفعال است" : "این کالا فعلاً ناموجود است"}
        <p className="mt-1 text-xs font-normal text-ink-500">برای اطلاع از موجودی با ما تماس بگیرید.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-ink-700">تعداد</span>
        <span className="inline-flex items-center rounded-xl bg-sand-100 p-1" dir="ltr">
          <button type="button" aria-label="کاهش" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg hover:bg-white"><Minus className="h-4 w-4" /></button>
          <span className="w-10 text-center text-base font-black">{toFa(qty)}</span>
          <button type="button" aria-label="افزایش" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg hover:bg-white disabled:opacity-40"><Plus className="h-4 w-4" /></button>
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-600">جمع</span>
        <span className="text-lg font-black text-navy-900">{formatPrice(p.price * qty)}</span>
      </div>
      {added ? (
        <div className="flex flex-col gap-2">
          <span className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-teal-600 font-bold text-white"><Check className="h-5 w-5" /> به سبد اضافه شد</span>
          <div className="flex gap-2">
            <Link href="/cart" className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-navy-800 text-sm font-bold text-white hover:bg-navy-700">سبد خرید و پرداخت</Link>
            <button type="button" onClick={() => setAdded(false)} className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300">ادامه خرید</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            addToCart({ kind: "product", slug: p.slug, title: p.title, price: p.price, image: p.image, qty, maxQty: max, physical: true, weightGrams: p.weightGrams, meta: p.category });
            setAdded(true);
          }}
          className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-madder-700 font-bold text-white transition-colors hover:bg-madder-600"
        >
          <ShoppingBag className="h-5 w-5" /> افزودن به سبد خرید
        </button>
      )}
      <p className="text-center text-xs text-ink-500">
        {max > 0 ? `${toFa(max)} عدد در انبار` : "سفارش با تأخیر ارسال (پیش‌خرید)"}
        {p.sku && <span dir="ltr" className="ms-2 text-ink-400">SKU: {p.sku}</span>}
      </p>
    </div>
  );
}
