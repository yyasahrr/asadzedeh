import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarDays, Clock3, MapPin } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getClasses, getOrders } from "@/lib/store";
import { toFa } from "@/lib/format";

export const metadata: Metadata = { title: "کلاس‌های من" };
export const dynamic = "force-dynamic";

export default async function MyClassesPage() {
  const user = await getSessionUser();
  const paid = user
    ? getOrders().filter(
        (o) => o.status === "پرداخت شده" && (o.userId === user.id || o.phone === user.phone || o.student === user.name)
      )
    : [];
  const classes = getClasses();
  const mine = paid.flatMap((o) =>
    (o.lines ?? [])
      .filter((l) => l.kind === "class")
      .map((l) => ({ order: o, cls: classes.find((c) => c.slug === l.slug), title: l.title }))
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">کلاس‌های من</h1>

      {!user && (
        <div className="rounded-2xl bg-card p-10 text-center shadow-card">
          <p className="font-extrabold text-navy-900">برای مشاهده کلاس‌ها وارد حساب شوید.</p>
          <Link href="/auth?next=/dashboard/classes" className="mt-3 inline-block text-sm font-bold text-teal-600 hover:underline">ورود / ثبت‌نام ←</Link>
        </div>
      )}

      {user && mine.length === 0 && (
        <div className="rounded-2xl bg-card p-10 text-center shadow-card">
          <p className="font-extrabold text-navy-900">در هیچ دوره حضوری ثبت‌نام نکرده‌اید.</p>
          <p className="mt-1 text-sm text-ink-600">دوره‌های حضوری در کارگاه تبریز با ظرفیت محدود برگزار می‌شوند.</p>
          <Link href="/classes" className="mt-3 inline-block text-sm font-bold text-teal-600 hover:underline">مشاهده دوره‌های حضوری ←</Link>
        </div>
      )}

      {mine.map(({ order, cls, title }) => (
        <article key={`${order.id}-${cls?.slug ?? title}`} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-navy-900">{cls?.title ?? title}</h2>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-600/25 ring-inset">
              سفارش <span dir="ltr">{order.id}</span>
            </span>
          </div>
          {cls ? (
            <>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-xl bg-sand-100 px-4 py-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-teal-600" />
                  <span className="font-semibold">{cls.days}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-sand-100 px-4 py-3">
                  <Clock3 className="h-4 w-4 shrink-0 text-teal-600" />
                  <span className="font-semibold">{cls.time}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-sand-100 px-4 py-3">
                  <MapPin className="h-4 w-4 shrink-0 text-teal-600" />
                  <span className="font-semibold">{cls.location}</span>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-7 text-ink-600">
                شروع دوره: <strong className="text-navy-900">{cls.startDate}</strong> • {toFa(cls.sessions)} جلسه • مدرس: {cls.instructor}
                <br />
                لطفاً ۱۵ دقیقه زودتر در کارگاه حاضر باشید. ابزار و مواد اولیه در کارگاه در اختیار شما قرار می‌گیرد.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {cls.lessons?.length ? (
                  <Link href={`/dashboard/classes/${cls.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-navy-800 px-4 text-sm font-bold text-white hover:bg-navy-700">
                    <BookOpen className="h-4 w-4" /> ورود به محتوای کلاس
                  </Link>
                ) : null}
                <Link href={`/classes/${cls.slug}`} className="inline-flex min-h-10 items-center rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300">
                  صفحه دوره
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-600">جزئیات این دوره به‌زودی به‌روزرسانی می‌شود.</p>
          )}
        </article>
      ))}
    </div>
  );
}
