"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { educationLinks } from "./nav";

export function EducationMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 140); };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); } };
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => { window.removeEventListener("keydown", onKeyDown); document.removeEventListener("pointerdown", onPointerDown); cancelClose(); };
  }, [open]);

  return <div ref={rootRef} className="relative" onPointerEnter={() => { cancelClose(); setOpen(true); }} onPointerLeave={scheduleClose} onFocus={() => setTimeout(() => setOpen(true), 0)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" aria-expanded={open} aria-controls="education-mega-menu" onClick={() => setOpen(value => !value)} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-ink-700 transition-colors hover:bg-sand-200/70 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
      آموزش <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
    </button>
    {open ? <div id="education-mega-menu" className="absolute right-0 top-[calc(100%+0.55rem)] w-[34rem] rounded-2xl border border-navy-900/10 bg-[#fffdf7]/95 p-2.5 shadow-[0_18px_45px_rgba(18,37,54,0.14)] backdrop-blur-xl" onPointerEnter={cancelClose}>
      <div className="grid grid-cols-2 gap-1.5">{educationLinks.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className="group flex min-h-20 gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-teal-800/10 hover:bg-teal-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-white"><Icon className="h-4 w-4" aria-hidden /></span><span><strong className="block text-sm text-navy-900">{label}</strong><span className="mt-1 block text-xs leading-5 text-ink-500">{description}</span></span></Link>)}</div>
    </div> : null}
  </div>;
}
