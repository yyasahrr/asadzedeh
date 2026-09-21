"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, GraduationCap, LogIn, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { educationLinks, primaryNavLinks } from "./nav";

export function MobileMenu({ accountHref }: { accountHref?: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const close = (restoreFocus = false) => { setOpen(false); if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus()); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") close(true); };
    const closeOnOutsidePress = (event: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) close(); };
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => { window.removeEventListener("keydown", closeOnEscape); document.removeEventListener("pointerdown", closeOnOutsidePress); };
  }, [open]);

  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));
  return <div ref={menuRef} className="relative z-50 lg:hidden">
    <button ref={triggerRef} type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "بستن منو" : "باز کردن منو"} className={cn("relative z-30 flex h-11 w-11 items-center justify-center rounded-xl text-navy-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600", open ? "bg-navy-900 text-white" : "hover:bg-sand-200/70")}>
      {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
    </button>
    {open ? <><div aria-hidden className="fixed inset-0 z-10 bg-navy-950/35 backdrop-blur-[3px]" /><div id="mobile-navigation" className="absolute left-0 top-[calc(100%+0.65rem)] z-20 max-h-[calc(100dvh-6rem)] w-[min(24rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl border border-white/80 bg-white/92 p-3 text-navy-900 shadow-[0_20px_55px_rgba(18,37,54,0.24)] backdrop-blur-2xl">
      <div className="flex items-center gap-2 px-1 pb-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-800"><GraduationCap className="h-4 w-4" aria-hidden /></span><div><p className="text-sm font-black">آموزش</p><p className="text-[11px] text-ink-500">مسیر مناسب یادگیری را انتخاب کنید</p></div></div>
      <nav aria-label="منوی موبایل" className="space-y-3"><div className="grid grid-cols-2 gap-1.5">{educationLinks.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active(href) ? "page" : undefined} className={cn("min-h-20 rounded-xl border p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600", active(href) ? "border-navy-900 bg-navy-900 text-white" : "border-navy-900/8 bg-[#fffdf8] hover:bg-teal-50")}><Icon className="h-4 w-4" aria-hidden /><strong className="mt-1.5 block text-xs">{label}</strong><span className={cn("mt-0.5 block text-[10px] leading-4", active(href) ? "text-white/75" : "text-ink-500")}>{description}</span></Link>)}</div>
      <div className="border-t border-navy-900/10 pt-2">{primaryNavLinks.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={active(link.href) ? "page" : undefined} className={cn("flex min-h-11 items-center rounded-xl px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600", active(link.href) ? "bg-navy-900 text-white" : "text-navy-900 hover:bg-sand-100")}>{link.label}</Link>)}</div></nav>
      <Link href={accountHref ?? "/auth"} onClick={() => setOpen(false)} className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-navy-900/10 px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"><LogIn className="h-4 w-4" aria-hidden /> {accountHref ? "حساب کاربری" : "ورود / ثبت‌نام"}</Link>
      <Link href="/courses" onClick={() => setOpen(false)} className="mt-2 flex min-h-11 items-center justify-between rounded-xl bg-madder-700 px-4 text-sm font-bold text-white transition-colors hover:bg-madder-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-madder-500"><span>مشاهده دوره‌ها</span><ArrowLeft className="h-4 w-4" aria-hidden /></Link>
    </div></> : null}
  </div>;
}
