import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "../Logo";
import { NewsletterForm } from "../NewsletterForm";
import { getCourses, getClasses, getSettings } from "@/lib/store";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

export async function Footer() {
  const site = getSettings().site;
  const courses = getCourses().slice(0, 4);
  const classes = getClasses().slice(0, 3);

  const columns = [
    {
      title: "دوره‌های آنلاین",
      links: [
        ...courses.map((c) => ({ href: `/courses/${c.slug}`, label: c.shortTitle })),
        { href: "/courses", label: "همه دوره‌ها" },
      ],
    },
    {
      title: "کلاس‌های حضوری",
      links: [
        ...classes.map((c) => ({ href: `/classes/${c.slug}`, label: c.title.replace(" (حضوری)", "") })),
        { href: "/classes", label: "همه کلاس‌ها" },
      ],
    },
    {
      title: "دسترسی سریع",
      links: [
        { href: "/paths", label: "مسیرهای آموزشی" },
        { href: "/instructors", label: "اساتید" },
        { href: "/shop", label: "فروشگاه ابزار و دار" },
        { href: "/shop/preorder", label: "پیگیری پیش‌سفارش" },
        { href: "/blog", label: "دانشنامه" },
        { href: "/about", label: "درباره ما" },
        { href: "/dashboard", label: "پنل هنرجو" },
      ],
    },
  ];

  return (
    <footer className="bg-navy-900 text-white print:hidden">
      <div className="pattern-strip" aria-hidden />
      <div className="shell py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo dark name={site.siteName} tagline={site.tagline} />
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/70">{site.footerAbout}</p>
            <div className="mt-5 space-y-2.5 text-sm text-white/70">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-ochre-200" />
                {site.address}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-ochre-200" />
                <span dir="ltr">{site.phone}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-ochre-200" />
                <span dir="ltr">{site.email}</span>
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2">
              {[
                { icon: InstagramIcon, label: "اینستاگرام", href: site.socials.instagram },
                { icon: TelegramIcon, label: "تلگرام", href: site.socials.telegram },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="mb-4 text-sm font-black text-ochre-200">{col.title}</h3>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-white/70 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-black">خبرنامه بافت و رنگ</h3>
              <p className="mt-1 text-sm text-white/60">هر هفته یک نکته بافت، یک فرمول رنگ و خبر دوره‌های جدید.</p>
            </div>
            <div className="w-full lg:max-w-md">
              <NewsletterForm dark />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <p>© ۱۴۰۵ {site.siteName} — تمام حقوق محفوظ است.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="transition-colors hover:text-white">قوانین و مقررات</Link>
            <Link href="/privacy" className="transition-colors hover:text-white">حریم خصوصی</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
