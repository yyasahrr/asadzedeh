"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cartCount } from "@/lib/cart";
import { toFa } from "@/lib/format";

export function CartBadge() {
  const [count, setCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    return cartCount();
  });

  useEffect(() => {
    const onChange = () => setCount(cartCount());
    window.addEventListener("az:cart", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("az:cart", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return (
    <Link
      href="/cart"
      aria-label={`سبد خرید، ${toFa(count)} کالا`}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-sand-200/70 hover:text-navy-900"
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-madder-700 px-1 text-[11px] font-bold text-white">
          {toFa(count)}
        </span>
      )}
    </Link>
  );
}
