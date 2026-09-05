import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PlayCircle, ShoppingBag } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { getCourses, getEnrollmentsByUser } from "@/lib/store";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const metadata: Metadata = { title: "دوره‌های من" };
export const dynamic = "force-dynamic";

export default async function MyCoursesPage() {
  const user = await getSessionUser();
  const courses = getCourses();
  const enrolled = user
    ? getEnrollmentsByUser(user.id)
        .map((e) => ({ e, course: courses.find((c) => c.slug === e.courseSlug) }))
        .filter((x): x is { e: (typeof x)["e"]; course: NonNullable<(typeof x)["course"]> } => !!x.course)
    : [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">دوره‌های من</h1>
      {!user && (
        <div className="rounded-2xl bg-card p-8 text-center shadow-card ring-1 ring-ink-900/5">
          <p className="font-bold text-navy-900">برای مشاهده دوره‌هایتان وارد شوید.</p>
          <Link href="/auth?next=/dashboard/courses" className="mt-3 inline-flex h-11 items-center rounded-xl bg-navy-800 px-8 font-bold text-white">ورود / ثبت‌نام</Link>
        </div>
      )}
      {user && enrolled.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-14 text-center shadow-card ring-1 ring-ink-900/5">
          <ShoppingBag className="h-10 w-10 text-ink-300" />
          <p className="font-bold text-navy-900">هنوز دوره‌ای نخریده‌اید.</p>
          <p className="text-sm text-ink-500">با خرید هر دوره، جلسات ویدیویی همین‌جا فعال می‌شود.</p>
          <Link href="/courses" className="mt-1 inline-flex h-11 items-center rounded-xl bg-navy-800 px-8 font-bold text-white">مشاهده دوره‌ها</Link>
        </div>
      )}
      {enrolled.map(({ e, course }) => {
        const lessons = course.lessons ?? [];
        const pct = lessons.length ? Math.round((e.completed.length / lessons.length) * 100) : 0;
        const last = lessons.find((l) => l.id === e.lastLessonId) ?? lessons.find((l) => !e.completed.includes(l.id));
        return (
          <article key={e.id} className="grid gap-4 rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-[180px_1fr_auto] sm:items-center">
            <div className="relative h-32 overflow-hidden rounded-xl sm:h-full sm:min-h-28">
              <Image src={course.image} alt={course.title} fill sizes="200px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <h2 className="leading-7 font-extrabold text-navy-900">{course.title}</h2>
              <p className="mt-1 text-[13px] text-ink-500">
                {lessons.length === 0 ? "جلسات به‌زودی منتشر می‌شود" : last ? `جلسه ${toFa(last.order)}: ${last.title}` : "همه جلسات را تکمیل کرده‌اید 🎉"}
                {" • "}ثبت‌نام: {e.createdAt}
              </p>
              <ProgressBar value={pct} showLabel className="mt-3 max-w-sm" />
            </div>
            <Link href={`/dashboard/courses/${course.slug}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold whitespace-nowrap text-white transition-colors hover:bg-navy-700">
              <PlayCircle className="h-4 w-4" />
              {pct > 0 ? "ادامه یادگیری" : "شروع دوره"}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
