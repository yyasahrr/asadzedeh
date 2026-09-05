import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardCheck, Clapperboard, Users, Wallet } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { formatPrice, toFa } from "@/lib/format";
import { getAudit, getCourses, getEnrollments, getInstructorByUser, getOrders, getSubmissions, getVideos } from "@/lib/store";
import { auditActionLabels } from "@/lib/audit";

export const metadata: Metadata = { title: "پنل مدرس" };
export const dynamic = "force-dynamic";

export default async function InstructorHome() {
  const user = (await getSessionUser())!;
  const inst = getInstructorByUser(user.id)!;
  const courses = getCourses().filter((c) => c.instructorSlug === inst.slug);
  const slugs = new Set(courses.map((c) => c.slug));
  const titles = new Set(courses.flatMap((c) => [c.title, c.shortTitle]));
  const enrollments = getEnrollments().filter((e) => slugs.has(e.courseSlug));
  const submissions = getSubmissions().filter((s) => titles.has(s.course));
  const pending = submissions.filter((s) => s.status === "در حال بررسی");
  const videos = getVideos();
  const lessonsTotal = courses.reduce((s, c) => s + (c.lessons?.length ?? 0), 0);
  const share = (inst.commissionPercent ?? 60) / 100;
  const revenue = getOrders()
    .filter((o) => o.status === "پرداخت شده")
    .reduce((sum, o) => sum + (o.lines ?? []).filter((l) => l.kind === "course" && slugs.has(l.slug)).reduce((s, l) => s + l.price * l.qty, 0), 0);
  const recent = getAudit()
    .filter((a) => a.actorId === user.id || courses.some((c) => a.target === `course:${c.slug}`))
    .slice(0, 6);

  const cards = [
    { icon: BookOpen, label: "دوره‌های من", value: toFa(courses.length), sub: `${toFa(lessonsTotal)} جلسه ویدیویی`, href: "/instructor/courses" },
    { icon: Users, label: "هنرجویان فعال", value: toFa(enrollments.length), sub: "ثبت‌نام‌های پرداخت‌شده", href: "/instructor/students" },
    { icon: ClipboardCheck, label: "تمرین‌های منتظر بررسی", value: toFa(pending.length), sub: `${toFa(submissions.length)} تمرین در کل`, href: "/instructor/students" },
    { icon: Wallet, label: "سهم شما از فروش", value: formatPrice(Math.round(revenue * share)), sub: `${toFa(inst.commissionPercent ?? 60)}٪ از ${formatPrice(revenue)}`, href: "/instructor/earnings" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-900">سلام، {inst.name.replace(/^استاد\s*/, "")} 👋</h1>
        <p className="mt-1 text-sm text-ink-600">از اینجا جلسات دوره‌هایتان را آپلود کنید، تمرین‌ها را بررسی کنید و درآمدتان را ببینید.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5 transition-shadow hover:shadow-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-500">{c.label}</span>
              <c.icon className="h-5 w-5 text-teal-700" />
            </div>
            <p className="mt-3 text-2xl font-black text-navy-900">{c.value}</p>
            <p className="mt-1 text-xs text-ink-500">{c.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
          <h2 className="mb-4 flex items-center gap-2 font-black text-navy-900"><Clapperboard className="h-5 w-5 text-teal-700" /> وضعیت دوره‌ها</h2>
          {courses.length === 0 ? (
            <p className="text-sm text-ink-500">هنوز دوره‌ای به شما اختصاص داده نشده است. مدیریت می‌تواند از بخش دوره‌ها شما را به‌عنوان مدرس انتخاب کند.</p>
          ) : (
            <ul className="divide-y divide-ink-900/5">
              {courses.map((c) => {
                const ls = c.lessons ?? [];
                const ready = ls.filter((l) => l.videoId && videos.find((v) => v.id === l.videoId)?.status === "ready").length;
                const pct = ls.length ? Math.round((ready / ls.length) * 100) : 0;
                const students = enrollments.filter((e) => e.courseSlug === c.slug).length;
                return (
                  <li key={c.slug} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/instructor/courses/${c.slug}`} className="text-sm font-bold text-ink-900 hover:text-teal-700">{c.shortTitle}</Link>
                      <p className="text-xs text-ink-500">{toFa(ls.length)} جلسه • {toFa(ready)} ویدیو آماده • {toFa(students)} هنرجو</p>
                      <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-sand-200">
                        <div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <Link href={`/instructor/courses/${c.slug}`} className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-700">مدیریت جلسات</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
          <h2 className="mb-4 font-black text-navy-900">فعالیت‌های اخیر</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-ink-500">فعالیتی ثبت نشده.</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((a) => (
                <li key={a.id} className="text-xs">
                  <p className="font-bold text-ink-800">{auditActionLabels[a.action] ?? a.action}</p>
                  <p className="text-ink-500">
                    {a.actorName ?? "سیستم"} • <span dir="ltr">{new Date(a.ts).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" })}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
