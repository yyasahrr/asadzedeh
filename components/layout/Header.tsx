import Link from "next/link";
import { LayoutDashboard, Search, ShieldCheck, UserRound } from "lucide-react";
import { Logo } from "../Logo";
import { Button } from "../ui/Button";
import { MobileMenu } from "./MobileMenu";
import { CartBadge } from "../cart/CartBadge";
import { navLinks } from "./nav";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/store";

export async function Header() {
  const user = await getSessionUser();
  const site = getSettings().site;

  return (
    <>
      {site.announcement.enabled && (
        <Link
          href={site.announcement.link}
          className="block bg-madder-700 px-4 py-2 text-center text-[13px] font-bold text-white transition-colors hover:bg-madder-600 print:hidden"
        >
          {site.announcement.text}
        </Link>
      )}
      <header className="sticky top-2 z-40 px-2 print:hidden sm:top-3 sm:px-4">
        <div className="shell glass-surface flex h-[66px] items-center justify-between gap-3 rounded-[22px] px-3 sm:px-5">
            <div className="flex items-center gap-6">
              <Logo name={site.siteName} tagline={site.tagline} />
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
              <CartBadge />
              {user ? (
                <Link
                  href={isStaff(user) ? "/admin" : "/dashboard"}
                  className="flex h-10 items-center gap-2 rounded-xl px-2 text-ink-700 transition-colors hover:bg-sand-200/70 hover:text-navy-900"
                  aria-label={isStaff(user) ? "پنل مدیریت" : "پنل هنرجو"}
                  title={user.name}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-sm font-black text-white">
                    {isStaff(user) ? <ShieldCheck className="h-4 w-4" /> : (user.name.charAt(0) || <LayoutDashboard className="h-4 w-4" />)}
                  </span>
                  <span className="hidden max-w-24 truncate text-sm font-bold xl:block">{user.name}</span>
                </Link>
              ) : (
                <Link
                  href="/auth"
                  aria-label="ورود به حساب"
                  className="hidden h-10 w-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-sand-200/70 hover:text-navy-900 sm:flex"
                >
                  <UserRound className="h-5 w-5" />
                </Link>
              )}
              <Button href="/courses" size="sm" className="mr-1 hidden md:inline-flex">
                مشاهده دوره‌ها
              </Button>
              <MobileMenu />
            </div>
        </div>
      </header>
    </>
  );
}
