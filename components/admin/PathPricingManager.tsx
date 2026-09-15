"use client";

import { useState } from "react";
import { toFa } from "@/lib/format";

interface Props {
  initialMode?: "FIXED" | "PERCENTAGE";
  initialFixedPrice?: number;
  initialDiscountPercentage?: number;
  coursesTotal: number;
}

export function PathPricingManager({
  initialMode = "FIXED",
  initialFixedPrice,
  initialDiscountPercentage,
  coursesTotal,
}: Props) {
  const [mode, setMode] = useState<"FIXED" | "PERCENTAGE">(initialMode);
  const [fixedPrice, setFixedPrice] = useState(initialFixedPrice ?? "");
  const [discountPct, setDiscountPct] = useState(initialDiscountPercentage ?? "");

  const finalPrice =
    mode === "FIXED"
      ? typeof fixedPrice === "number"
        ? Math.min(fixedPrice, coursesTotal)
        : coursesTotal
      : typeof discountPct === "number"
        ? Math.round(coursesTotal * (1 - Math.min(discountPct, 100) / 100))
        : coursesTotal;

  const discount = Math.max(0, coursesTotal - finalPrice);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-bold text-navy-800">نحوه قیمت‌گذاری</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="radio"
              name="pricingMode"
              value="FIXED"
              checked={mode === "FIXED"}
              onChange={() => setMode("FIXED")}
              className="h-4 w-4 border-ink-300 text-teal-600 focus:ring-teal-600"
            />
            قیمت ثابت
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="radio"
              name="pricingMode"
              value="PERCENTAGE"
              checked={mode === "PERCENTAGE"}
              onChange={() => setMode("PERCENTAGE")}
              className="h-4 w-4 border-ink-300 text-teal-600 focus:ring-teal-600"
            />
            درصد تخفیف
          </label>
        </div>
      </div>

      {mode === "FIXED" ? (
        <div>
          <label htmlFor="path-fixedPrice" className="mb-1 block text-sm font-bold text-navy-800">
            قیمت مسیر (تومان)
          </label>
          <input
            id="path-fixedPrice"
            name="fixedPrice"
            type="number"
            min={0}
            max={coursesTotal}
            value={fixedPrice}
            onChange={(e) => setFixedPrice(Number(e.target.value) || "")}
            placeholder={toFa(coursesTotal)}
            className="h-11 w-full rounded-xl border border-ink-900/10 px-4 text-sm focus:border-teal-600 focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink-500">
            مجموع دوره‌ها: {toFa(coursesTotal)} تومان — حداکثر قیمت مسیر = مجموع دوره‌ها
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="path-discount" className="mb-1 block text-sm font-bold text-navy-800">
            درصد تخفیف
          </label>
          <div className="flex items-center gap-3">
            <input
              id="path-discount"
              name="discountPercentage"
              type="number"
              min={0}
              max={100}
              value={discountPct}
              onChange={(e) => setDiscountPct(Number(e.target.value) || "")}
              placeholder="مثلاً ۲۰"
              className="h-11 w-full rounded-xl border border-ink-900/10 px-4 text-sm focus:border-teal-600 focus:outline-none"
            />
            <span className="text-sm font-bold text-ink-600">٪</span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            مجموع دوره‌ها: {toFa(coursesTotal)} تومان — تخفیف اعمال می‌شود
          </p>
        </div>
      )}

      <div className="rounded-xl bg-sand-50 p-4 ring-1 ring-ink-900/5">
        <p className="text-sm font-bold text-navy-800">پیش‌نمایش قیمت</p>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-xl font-black text-teal-700">{toFa(finalPrice)} تومان</span>
          {discount > 0 && (
            <span className="text-sm text-ink-400 line-through">{toFa(coursesTotal)} تومان</span>
          )}
        </div>
        {discount > 0 && (
          <p className="mt-1 text-xs font-bold text-madder-700">
            صرفه‌جویی: {toFa(discount)} تومان (٪{toFa(Math.round((discount / coursesTotal) * 100))})
          </p>
        )}
      </div>
    </div>
  );
}
