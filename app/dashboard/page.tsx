import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Award, BookOpen, CalendarDays, Clock3, Package, PlayCircle, ShoppingBag } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import {
  getCertificatesByStudent,
  getClasses,
  getCourses,
  getEnrollmentsByUser,
  getOrders,
  getPreorders,
  getSubmissions,
} from "@/lib/store";
import { formatPriceCompact, toFa } from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "پنل هنرجو" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const name = user?.name ?? "هنرجو";
  const firstName = name.split(" ")[0];

  const courses = getCourses();
  const enrollments = user ? getEnrollmentsByUser(user.id) : [];
  const enrolledCourses = enrollments
    .map((e) => {
      const course = courses.find((c) => c.slug === e.courseSlug);
      if (!course) return null;
      const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
      const done = new Set(e.completed);
      const pct = lessons.length ? Math.round((done.size / lessons.length) * 100) : 0;
      const next = (e.lastLessonId && lessons.find((l) => l.id === e.lastLessonId && !done.has(l.id))) || lessons.find((l) => !done.has(l.id));
      return { course, enrollment: e, pct, next, total: lessons.length, doneCount: done.size };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const continueLearning =
    enrolledCourses.filter((c) => c.pct < 100).sort((a, b) => b.pct - a.pct)[0] ?? enrolledCourses[0] ?? null;

  const myOrders = user
    ? getOrders().filter((o) => o.userId === user.id || o.phone === user.phone || o.student === user.name)
    : [];
  const classOrders = myOrders.filter((o) => o.status === "پرداخت شده" && o.lines?.some((l) => l.kind === "class"));
  const classSlugs = new Set(classOrders.flatMap((o) => (o.lines ?? []).filter((l) => l.kind === "class").map((l) => l.slug)));
  const nextClass = getClasses().find((c) => classSlugs.has(c.slug)) ?? null;

  const myPreorders = user ? getPreorders().filter((p) => p.userId === user.id || p.phone === user.phone) : [];
  const openPreorders = myPreorders.filter((p) => !["تحویل شده", "لغو شده"].includes(p.status));
  const certs = user ? getCertificatesByStudent(user.name) : [];
  const pendingSubs = user ? getSubmissions().filter((s) => s.student === user.name && s.status !== "تأیید شده") : [];

  const totalLessonsDone = enrolledCourses.reduce((s, c) => s + c.doneCount, 0);

  const stats = [
    { icon: BookOpen, label: "دوره فعال", value: toFa(enrolledCourses.length), href: "/dashboard/courses" },
    { icon: PlayCircle, label: "جلسه دیده‌شده", value: toFa(totalLessonsDone), href: "/dashboard/courses" },
    { icon: Award, label: "گواهی", value: toFa(certs.length), href: "/dashboard/certificates" },
    { icon: ShoppingBag, label: "سفارش", value: toFa(myOrders.length), href: "/dashboard/orders" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy-900">سلام {firstName} 👋</h1>
          <p className="mt-1 text-sm text-ink-600">
            {enrolledCourses.length > 0
              ? `${toFa(totalLessonsDone)} جلسه را تا امروز کامل کرده‌اید؛ ادامه بدهید!`
              : "هنوز دوره‌ای شروع نکرده‌اید؛ اولین قدم را همین امروز بردارید."}
          </p>
        </div>
        {!user && (
          <Link href="/auth?next=/dashboard" className="rounded-full bg-navy-800 px-4 py-2 text-sm font-bold text-white hover:bg-navy-700">
            ورود به حساب
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bento-surface flex items-center gap-3 p-4 transition-shadow hover:shadow-lift">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <s.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xl font-black text-navy-900">{s.value}</span>
              <span className="block text-xs text-ink-500">{s.label}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* Continue learning */}
      {continueLearning ? (
        <section className="bento-surface grid gap-4 p-5 sm:grid-cols-[200px_1fr] sm:p-6" aria-label="ادامه یادگیری">
          <div className="relative min-h-36 overflow-hidden rounded-xl">
            <Image src={continueLearning.course.image} alt={continueLearning.course.title} fill sizes="220px" className="object-cover" />
          </div>
          <div className="flex flex-col">
            <p className="text-xs font-bold text-teal-600">ادامه یادگیری</p>
            <h2 className="mt-1 leading-8 font-extrabold text-navy-900">{continueLearning.course.title}</h2>
            <p className="mt-1 text-sm text-ink-600">
              {continueLearning.next
                ? `جلسه ${toFa(continueLearning.next.order)}: ${continueLearning.next.title}`
                : "همه جلسات را کامل کرده‌اید 🎉"}
            </p>
            <ProgressBar value={continueLearning.pct} showLabel className="mt-3 max-w-md" />
            <div className="mt-4">
              <Link
                href={`/dashboard/courses/${continueLearning.course.slug}${continueLearning.next ? `?lesson=${continueLearning.next.id}` : ""}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700"
              >
                <PlayCircle className="h-4 w-4" />
                {continueLearning.next ? "ادامه درس" : "مرور دوره"}
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="bento-surface p-6 text-center" aria-label="شروع یادگیری">
          <p className="font-extrabold text-navy-900">هنوز در دوره‌ای ثبت‌نام نکرده‌اید</p>
          <p className="mt-1 text-sm text-ink-600">جلسه اول هر دوره رایگان است؛ قبل از خرید امتحان کنید.</p>
          <Link href="/courses" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white hover:bg-navy-700">
            مشاهده دوره‌های آنلاین
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Next class */}
        <section className="persian-corner overflow-hidden rounded-3xl bg-navy-900 p-6 text-white shadow-card" aria-label="کلاس بعدی">
          <p className="flex items-center gap-2 text-sm font-bold text-ochre-200">
            <CalendarDays className="h-4 w-4" />
            کلاس حضوری شما
          </p>
          {nextClass ? (
            <>
              <h2 className="mt-2 font-extrabold">{nextClass.title}</h2>
              <p className="mt-1 text-sm text-white/70">{nextClass.location}</p>
              <p className="mt-3 flex items-center gap-2 text-sm">
                <Clock3 className="h-4 w-4 text-ochre-200" />
                {nextClass.days} • {nextClass.time}
              </p>
              <p className="mt-1 text-xs text-white/60">شروع: {nextClass.startDate}</p>
            </>
          ) : (
            <>
              <h2 className="mt-2 font-extrabold">کلاس حضوری فعالی ندارید</h2>
              <p className="mt-1 text-sm text-white/70">دوره‌های حضوری کارگاه تبریز با ظرفیت محدود برگزار می‌شوند.</p>
            </>
          )}
          <Link href={nextClass ? "/dashboard/classes" : "/classes"} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-ochre-200 hover:text-white">
            {nextClass ? "جزئیات کلاس‌های من" : "مشاهده دوره‌های حضوری"}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </section>

        {/* Orders & preorders */}
        <section className="bento-surface p-6" aria-label="سفارش‌ها">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-extrabold text-navy-900">سفارش‌ها و پیش‌سفارش‌ها</h2>
            <Link href="/dashboard/orders" className="text-[13px] font-bold text-teal-600 hover:text-teal-700">
              همه سفارش‌ها ←
            </Link>
          </div>
          {myOrders.length === 0 && openPreorders.length === 0 ? (
            <p className="rounded-xl bg-sand-50 px-4 py-6 text-center text-sm text-ink-500">هنوز سفارشی ثبت نشده است.</p>
          ) : (
            <ul className="space-y-3">
              {openPreorders.slice(0, 2).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-ochre-50/60 px-4 py-3 ring-1 ring-ochre-700/10">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-bold text-ink-800">
                      <Package className="h-4 w-4 shrink-0 text-ochre-700" />
                      {p.productTitle}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500" dir="ltr">{p.id}{p.eta ? ` • ${p.eta}` : ""}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
              {myOrders.slice(0, 3).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 rounded-xl bg-sand-50 px-4 py-3 ring-1 ring-ink-900/5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-800">{o.item}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      <span dir="ltr">{o.id}</span> • {formatPriceCompact(o.amount)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
          {pendingSubs.length > 0 && (
            <p className="mt-4 text-xs text-ink-500">
              {toFa(pendingSubs.length)} تمرین در انتظار بررسی دارید.{" "}
              <Link href="/dashboard/assignments" className="font-bold text-teal-600 hover:underline">مشاهده</Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
