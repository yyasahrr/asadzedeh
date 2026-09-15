import Image from "next/image";
import Link from "next/link";
import { Hammer, PackageCheck, PackageX } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPrice, toFa } from "@/lib/format";
import { Badge } from "../ui/Badge";
import { cn } from "@/lib/utils";

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const p = product;
  const out = p.kind === "physical" && p.stock <= 0 && !p.allowBackorder;
  return (
    <Link
      href={`/shop/${p.slug}`}
      className={cn(
        "group bento-surface flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-teal-600/20 hover:shadow-lift",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image src={p.image} alt={p.title} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className={cn("object-cover transition-transform duration-500 group-hover:scale-[1.04]", out && "grayscale")} />
        {p.badge && (
          <span className={cn("absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow-card", p.kind === "preorder" ? "bg-navy-800" : "bg-madder-700")}>
            {p.badge}
          </span>
        )}
        {p.oldPrice && p.oldPrice > p.price && (
          <span className="absolute top-3 left-3 rounded-full bg-teal-600 px-2.5 py-1 text-xs font-black text-white">
            {toFa(Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100))}٪
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <Badge tone="navy">{p.category}</Badge>
          {p.kind === "preorder" ? (
            <Badge tone="ochre"><Hammer className="h-3 w-3" /> ساخت سفارشی</Badge>
          ) : out ? (
            <Badge tone="madder"><PackageX className="h-3 w-3" /> ناموجود</Badge>
          ) : (
            <Badge tone="teal"><PackageCheck className="h-3 w-3" /> {p.stock > 0 ? `${toFa(p.stock)} عدد موجود` : "سفارش با تأخیر"}</Badge>
          )}
        </div>
        <h3 className="text-[16px] leading-8 font-extrabold text-navy-900 transition-colors group-hover:text-navy-700">{p.title}</h3>
        <p className="line-clamp-2 text-sm leading-7 text-ink-600">{p.excerpt}</p>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {p.oldPrice && p.oldPrice > p.price && <p className="text-xs text-ink-400 line-through">{formatPrice(p.oldPrice)}</p>}
            <p className="text-lg font-black text-navy-900">
              {p.kind === "preorder" && <span className="text-xs font-bold text-ink-500">از </span>}
              {formatPrice(p.price)}
            </p>
          </div>
          <span className="text-xs font-bold text-teal-700">{p.kind === "preorder" ? "ثبت پیش‌سفارش ←" : "مشاهده و خرید ←"}</span>
        </div>
      </div>
    </Link>
  );
}
