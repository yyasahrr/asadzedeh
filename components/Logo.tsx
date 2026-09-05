import Link from "next/link";
import { cn } from "@/lib/utils";

/** Brand mark: a kilim-diamond medallion drawn in pure SVG. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-10 w-10", className)} aria-hidden>
      <rect x="8" y="8" width="32" height="32" rx="6" fill="#193B5C" transform="rotate(45 24 24)" />
      <rect x="14" y="14" width="20" height="20" rx="3" fill="none" stroke="#E8D8B8" strokeWidth="2" transform="rotate(45 24 24)" />
      <rect x="19.5" y="19.5" width="9" height="9" fill="#9D382C" transform="rotate(45 24 24)" />
      <circle cx="24" cy="24" r="1.6" fill="#E8D8B8" />
    </svg>
  );
}

export function Logo({ dark = false, className, name = "اسدزاده", tagline = "آموزش فرش و گلیم ایرانی" }: { dark?: boolean; className?: string; name?: string; tagline?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="اسدزاده — صفحه اصلی">
      <LogoMark className="transition-transform duration-300 group-hover:rotate-90" />
      <span className="flex flex-col leading-none">
        <span className={cn("text-xl font-black tracking-tight", dark ? "text-white" : "text-navy-900")}>{name}</span>
        <span className={cn("mt-1 text-[11px] font-semibold", dark ? "text-white/60" : "text-ink-500")}>{tagline}</span>
      </span>
    </Link>
  );
}
