"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navLinks } from "./nav";
import { Button } from "../ui/Button";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "بستن منو" : "باز کردن منو"}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-navy-900 transition-colors hover:bg-sand-200/70"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 animate-fade-in border-b border-ink-900/10 bg-sand-50 px-4 pt-2 pb-5 shadow-lift">
          <nav className="flex flex-col" aria-label="منوی موبایل">
            {navLinks.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "border-b border-ink-900/5 py-3.5 text-[15px] font-bold transition-colors last:border-0",
                    active ? "text-madder-700" : "text-ink-700 hover:text-navy-800"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <Button href="/courses" size="lg" className="mt-3 w-full">
            مشاهده دوره‌ها
          </Button>
        </div>
      )}
    </div>
  );
}
