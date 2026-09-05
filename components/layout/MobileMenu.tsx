"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navLinks } from "./nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePress);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative z-50 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? "بستن منو" : "باز کردن منو"}
        className={cn(
          "relative z-30 flex h-10 w-10 items-center justify-center rounded-xl text-navy-900 transition-all",
          open ? "bg-navy-900 text-white" : "hover:bg-sand-200/70",
        )}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-10 bg-navy-950/18 backdrop-blur-[2px]"
          />
          <div
            id="mobile-navigation"
            className="glass-surface absolute left-0 top-[calc(100%+0.75rem)] z-20 w-[min(23rem,calc(100vw-1rem))] origin-top-left animate-[menu-in_180ms_cubic-bezier(0.22,1,0.36,1)] overflow-hidden rounded-2xl p-2 shadow-lift"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-xs font-bold text-ink-500">منوی اصلی</p>
              <span className="text-[11px] text-ink-400">اسدزاده</span>
            </div>
            <nav className="grid grid-cols-2 gap-1" aria-label="منوی موبایل">
              {navLinks.map((link) => {
                const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-xl px-3 text-sm font-bold transition-colors",
                      active
                        ? "bg-navy-900 text-white"
                        : "text-ink-700 hover:bg-sand-100 hover:text-navy-900",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <Link
              href="/courses"
              onClick={() => setOpen(false)}
              className="mt-2 flex min-h-11 items-center justify-between rounded-xl bg-madder-700 px-4 text-sm font-bold text-white transition-colors hover:bg-madder-600"
            >
              مشاهده دوره‌ها
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
