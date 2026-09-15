"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";
import { addToCart, type CartItem } from "@/lib/cart";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  item,
  label = "افزودن به سبد خرید",
  className,
}: {
  item: CartItem;
  label?: string;
  className?: string;
}) {
  const [added, setAdded] = useState(false);

  if (added) {
    return (
      <span className={cn("flex flex-col gap-2", className)}>
        <span className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-8 font-bold text-white">
          <Check className="h-5 w-5" />
          به سبد اضافه شد
        </span>
        <Link href="/cart" className="text-center text-sm font-bold text-teal-700 hover:underline">
          مشاهده سبد و پرداخت ←
        </Link>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        addToCart(item);
        setAdded(true);
      }}
      className={cn(
        "inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700",
        className
      )}
    >
      <ShoppingBag className="h-5 w-5" />
      {label}
    </button>
  );
}
