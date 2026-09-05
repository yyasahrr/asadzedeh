import Link from "next/link";
import { Search, ShoppingBag, UserRound } from "lucide-react";
import { Logo } from "../Logo";
import { Button } from "../ui/Button";
import { MobileMenu } from "./MobileMenu";
import { navLinks } from "./nav";

export function Header() {
  return (
    <header className="sticky top-0 z-40 print:hidden">
      <div className="border-b border-ink-900/10 bg-sand-50/95 backdrop-blur">
        <div className="shell flex h-[68px] items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="ناوبری اصلی">
              {navLinks.slice(1).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-2.5 py-2 text-sm font-semibold whitespace-nowrap text-ink-700 transition-colors hover:bg-sand-200/60 hover:text-navy-900"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/courses"
              aria-label="جست‌وجو در دوره‌ها"
              className="hidden h-10 w-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-sand-200/70 hover:text-navy-900 sm:flex"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              href="/cart"
              aria-label="سبد خرید"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-sand-200/70 hover:text-navy-900"
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-madder-700 px-1 text-[11px] font-bold text-white">
                ۲
              </span>
            </Link>
            <Link
              href="/dashboard"
              aria-label="حساب کاربری"
              className="hidden h-10 w-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-sand-200/70 hover:text-navy-900 sm:flex"
            >
              <UserRound className="h-5 w-5" />
            </Link>
            <Button href="/courses" size="sm" className="mr-1 hidden md:inline-flex">
              مشاهده دوره‌ها
            </Button>
            <MobileMenu />
          </div>
        </div>
      </div>
      <div className="pattern-strip-thin" aria-hidden />
    </header>
  );
}
