import type { Metadata } from "next";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { inPersonClasses } from "@/lib/data";

export const metadata: Metadata = { title: "کلاس‌های من" };

export default function MyClassesPage() {
  const mine = inPersonClasses.slice(0, 1);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">کلاس‌های من</h1>
      {mine.map((c) => (
        <article key={c.slug} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-navy-900">{c.title}</h2>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-600/25 ring-inset">
              جلسه ۷ از {c.sessions}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-xl bg-sand-100 px-4 py-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-teal-600" />
              <span className="font-semibold">{c.days}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-sand-100 px-4 py-3">
              <Clock3 className="h-4 w-4 shrink-0 text-teal-600" />
              <span className="font-semibold">{c.time}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-sand-100 px-4 py-3">
              <MapPin className="h-4 w-4 shrink-0 text-teal-600" />
              <span className="font-semibold">{c.location}</span>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-7 text-ink-600">
            جلسه بعد: <strong className="text-navy-900">شنبه ۲۲ شهریور</strong> — لطفاً ۱۵ دقیقه زودتر در کارگاه باشید.
            مبحث جلسه: ورنی‌بافی مقدماتی.
          </p>
        </article>
      ))}
    </div>
  );
}
