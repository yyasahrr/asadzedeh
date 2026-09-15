import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Traditional Persian carpet medallion logo.
 * Inspired by Isfahan and Tabriz carpet central medallion motifs.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-12 w-12", className)} aria-hidden>
      {/* Outer star-8 medallion — main field */}
      <path
        d="M32 1 38 8 48 5 47 16 58 16 51 24 60 32 51 40 58 48 47 48 48 59 38 56 32 63 26 56 16 59 17 48 6 48 13 40 4 32 13 24 6 16 17 16 16 5 26 8Z"
        fill="#193B5C"
      />
      {/* First inner ring */}
      <path
        d="M32 7 39 13 48 10 47 19 55 26 47 34 48 43 39 40 32 47 25 40 16 43 17 34 9 26 17 19 16 10 25 13Z"
        fill="#9D382C"
      />
      {/* Second inner ring */}
      <path
        d="M32 12 37 17 44 15 43 21 49 26 43 32 44 38 37 36 32 41 27 36 20 38 21 32 15 26 21 21 20 15 27 17Z"
        fill="#E8D8B8"
      />
      {/* Inner octagonal border */}
      <path
        d="M32 16 40 22 48 20 47 28 54 34 47 40 48 48 40 46 32 52 24 46 16 48 17 40 10 34 17 28 16 20 24 22Z"
        fill="none"
        stroke="#193B5C"
        strokeWidth="1.5"
      />
      {/* Decorative inner ring */}
      <circle cx="32" cy="32" r="16" fill="none" stroke="#9D382C" strokeWidth="0.8" strokeDasharray="2 2" />
      {/* Inner diamond */}
      <path
        d="M32 18 41 27 41 37 32 46 23 37 23 27Z"
        fill="#193B5C"
      />
      {/* Inner diamond highlight */}
      <path
        d="M32 22 37 28 37 36 32 42 27 36 27 28Z"
        fill="#9D382C"
      />
      {/* Cross lines — carpet thread motif */}
      <path d="M32 25v14M25 32h14" stroke="#E8D8B8" strokeWidth="1.2" strokeLinecap="round" />
      {/* Center dot — ghereh (knot) */}
      <circle cx="32" cy="32" r="3" fill="#E8D8B8" />
      <circle cx="32" cy="32" r="1.5" fill="#193B5C" />
      {/* Corner ornaments */}
      <circle cx="32" cy="14" r="1.5" fill="#E8D8B8" />
      <circle cx="32" cy="50" r="1.5" fill="#E8D8B8" />
      <circle cx="14" cy="32" r="1.5" fill="#E8D8B8" />
      <circle cx="50" cy="32" r="1.5" fill="#E8D8B8" />
      {/* Side ornaments */}
      <circle cx="22" cy="22" r="1" fill="#E8D8B8" />
      <circle cx="42" cy="22" r="1" fill="#E8D8B8" />
      <circle cx="22" cy="42" r="1" fill="#E8D8B8" />
      <circle cx="42" cy="42" r="1" fill="#E8D8B8" />
    </svg>
  );
}

export function Logo({ dark = false, className, name = "اسدزاده", tagline = "آموزش فرش و گلیم ایرانی" }: { dark?: boolean; className?: string; name?: string; tagline?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="اسدزاده — صفحه اصلی">
      <LogoMark className="transition-transform duration-300 group-hover:scale-105" />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-[2rem] leading-7", dark ? "text-white" : "text-navy-900")}>{name}</span>
        <span className={cn("mt-1 text-[11px] font-semibold", dark ? "text-white/60" : "text-ink-500")}>{tagline}</span>
      </span>
    </Link>
  );
}
