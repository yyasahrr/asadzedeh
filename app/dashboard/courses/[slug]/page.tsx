import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Lock, PlayCircle, ShieldCheck } from "lucide-react";
import { LessonPlayer } from "@/components/dashboard/LessonPlayer";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getSessionUser } from "@/lib/auth";
import { isEnrolled } from "@/lib/access";
import { toFa } from "@/lib/format";
import { getCourse, getEnrollment, getVideos } from "@/lib/store";

export const metadata: Metadata = { title: "مشاهده دوره" };
export const dynamic = "force-dynamic";

export default async function CoursePlayerPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const user = await getSessionUser();
  const { slug } = await params;
  const { lesson: lessonParam } = await searchParams;
  if (!user) redirect(`/auth?next=/dashboard/courses/${slug}`);
  const course = getCourse(slug);
  if (!course) notFound();
  const enrolled = isEnrolled(user, slug);
  const enrollment = getEnrollment(user.id, slug);
  const videos = new Map(getVideos().map((v) => [v.id, v]));
  const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
  const completed = new Set(enrollment?.completed ?? []);
  const visible = enrolled ? lessons : lessons.filter((l) => l.free);

  if (!enrolled && visible.length === 0) {
    redirect(`/courses/${slug}`);
  }

  const current =
    (lessonParam && visible.find((l) => l.id === lessonParam)) ||
    (enrollment?.lastLessonId && visible.find((l) => l.id === enrollment.lastLessonId)) ||
    visible.find((l) => !completed.has(l.id)) ||
    visible[0];
  const pct = lessons.length ? Math.round((completed.size / lessons.length) * 100) : 0;
  const chapters = Array.from(new Set(lessons.map((l) => l.chapter)));
  const idx = current ? visible.findIndex((l) => l.id === current.id) : -1;
  const next = idx >= 0 ? visible[idx + 1] : undefined;
  const prev = idx > 0 ? visible[idx - 1] : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/courses" className="inline-flex items-center gap-1 text-xs font-bold text-ink-500 hover:text-teal-700"><ArrowRight className="h-3.5 w-3.5" /> دوره‌های من</Link>
          <h1 className="mt-1 text-xl font-black text-navy-900 sm:text-2xl">{course.title}</h1>
        </div>
        {enrolled ? (
          <div className="w-full max-w-xs">
            <ProgressBar value={pct} showLabel />
            <p className="mt-1 text-xs text-ink-500">{toFa(completed.size)} از {toFa(lessons.length)} جلسه تکمیل شده</p>
          </div>
        ) : (
          <Link href={`/courses/${slug}`} className="inline-flex h-10 items-center rounded-xl bg-madder-700 px-5 text-sm font-bold text-white hover:bg-madder-600">خرید دوره برای دسترسی کامل</Link>
        )}
      </div>

      {!current ? (
        <div className="rounded-2xl bg-card p-10 text-center text-sm text-ink-500 shadow-card">جلسه‌ای برای این دوره منتشر نشده است. به‌زودی!</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <LessonPlayer
              key={current.id}
              courseSlug={slug}
              poster={course.image}
              lesson={{
                id: current.id,
                title: current.title,
                description: current.description,
                durationMin: current.durationMin,
                videoId: current.videoId,
                videoReady: !!current.videoId && videos.get(current.videoId)?.status !== "failed" && videos.has(current.videoId),
              }}
              initiallyCompleted={completed.has(current.id)}
              spotLicense={enrollment?.spotLicense}
            />
            <div className="flex items-center justify-between gap-3">
              {prev ? (
                <Link href={`/dashboard/courses/${slug}?lesson=${prev.id}`} className="inline-flex h-10 items-center gap-1 rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300">جلسه قبل</Link>
              ) : <span />}
              {next ? (
                <Link href={`/dashboard/courses/${slug}?lesson=${next.id}`} className="inline-flex h-10 items-center gap-1 rounded-xl bg-navy-800 px-4 text-sm font-bold text-white hover:bg-navy-700">جلسه بعد: {next.title}</Link>
              ) : (
                enrolled && pct === 100 && (
                  <Link href="/dashboard/certificates" className="inline-flex h-10 items-center gap-1 rounded-xl bg-teal-600 px-4 text-sm font-bold text-white hover:bg-teal-700">دریافت گواهی</Link>
                )
              )}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-ink-500">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              این ویدیوها با شماره موبایل شما واترمارک شده‌اند؛ لطفاً آن‌ها را به اشتراک نگذارید.
            </p>
          </div>

          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            {chapters.map((ch) => (
              <div key={ch} className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
                <div className="bg-sand-50 px-4 py-2.5 text-xs font-black text-navy-900">{ch}</div>
                <ul className="divide-y divide-ink-900/5">
                  {lessons.filter((l) => l.chapter === ch).map((l) => {
                    const locked = !enrolled && !l.free;
                    const active = current.id === l.id;
                    const inner = (
                      <>
                        {completed.has(l.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" /> : locked ? <Lock className="h-4 w-4 shrink-0 text-ink-300" /> : <PlayCircle className={`h-4 w-4 shrink-0 ${active ? "text-madder-700" : "text-ink-400"}`} />}
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm ${active ? "font-black text-navy-900" : "font-semibold text-ink-700"}`}>{toFa(l.order)}. {l.title}</span>
                          <span className="text-[11px] text-ink-500">{toFa(l.durationMin)} دقیقه{l.free && !enrolled ? " • رایگان" : ""}</span>
                        </span>
                      </>
                    );
                    return (
                      <li key={l.id}>
                        {locked ? (
                          <div className="flex items-center gap-2.5 px-4 py-2.5 opacity-60">{inner}</div>
                        ) : (
                          <Link href={`/dashboard/courses/${slug}?lesson=${l.id}`} className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-sand-50 ${active ? "bg-madder-50/50" : ""}`}>{inner}</Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}
