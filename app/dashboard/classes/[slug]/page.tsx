import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, FileText, Lock, PlayCircle } from "lucide-react";
import { LessonPlayer } from "@/components/dashboard/LessonPlayer";
import { hasPaidClassAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { getClass, getVideos } from "@/lib/store";

export const metadata: Metadata = { title: "محتوای کلاس حضوری" };
export const dynamic = "force-dynamic";

export default async function InPersonClassContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const user = await getSessionUser();
  const { slug } = await params;
  const { lesson: lessonParam } = await searchParams;
  if (!user) redirect(`/auth?next=/dashboard/classes/${slug}`);

  const inPersonClass = getClass(slug);
  if (!inPersonClass) notFound();
  if (!hasPaidClassAccess(user, slug)) redirect(`/classes/${slug}`);

  const lessons = [...(inPersonClass.lessons ?? [])].sort((a, b) => a.order - b.order);
  const videos = new Map(getVideos().map((video) => [video.id, video]));
  const current = (lessonParam && lessons.find((lesson) => lesson.id === lessonParam)) || lessons[0];
  const currentIndex = current ? lessons.findIndex((lesson) => lesson.id === current.id) : -1;
  const previous = currentIndex > 0 ? lessons[currentIndex - 1] : undefined;
  const next = currentIndex >= 0 ? lessons[currentIndex + 1] : undefined;
  const chapters = Array.from(new Set(lessons.map((lesson) => lesson.chapter)));

  return (
    <div className="space-y-5">
      <header>
        <Link href="/dashboard/classes" className="inline-flex items-center gap-1 text-xs font-bold text-ink-500 hover:text-teal-700">
          <ArrowRight className="h-3.5 w-3.5" /> کلاس‌های من
        </Link>
        <h1 className="mt-1 text-xl font-black text-navy-900 sm:text-2xl">{inPersonClass.title}</h1>
        <p className="mt-1 text-sm text-ink-600">ویدیوها، توضیحات و فایل‌های تکمیلی کلاس حضوری</p>
      </header>

      {!current ? (
        <div className="rounded-xl border border-dashed border-ink-900/12 bg-card p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-ink-400" />
          <p className="mt-3 font-black text-navy-900">محتوای تکمیلی هنوز منتشر نشده است</p>
          <p className="mt-1 text-sm text-ink-500">پس از انتشار توسط مدرس، فصل‌ها و فایل‌ها در همین صفحه نمایش داده می‌شوند.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-w-0 space-y-4">
            <LessonPlayer
              key={current.id}
              poster={inPersonClass.image}
              progressEnabled={false}
              lesson={{
                id: current.id,
                title: current.title,
                description: current.description,
                durationMin: current.durationMin,
                videoId: current.videoId,
                videoReady: !!current.videoId && videos.has(current.videoId) && videos.get(current.videoId)?.status !== "failed",
                attachments: current.attachments,
              }}
            />
            <nav className="flex items-center justify-between gap-3" aria-label="حرکت بین درس‌ها">
              {previous ? (
                <Link href={`/dashboard/classes/${slug}?lesson=${previous.id}`} className="inline-flex min-h-10 items-center rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300">درس قبل</Link>
              ) : <span />}
              {next ? (
                <Link href={`/dashboard/classes/${slug}?lesson=${next.id}`} className="inline-flex min-h-10 items-center rounded-xl bg-navy-800 px-4 text-sm font-bold text-white hover:bg-navy-700">درس بعد: {next.title}</Link>
              ) : null}
            </nav>
          </main>

          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start" aria-label="فهرست فصل‌ها">
            {chapters.map((chapter) => (
              <section key={chapter} className="overflow-hidden rounded-xl bg-card ring-1 ring-ink-900/8">
                <h2 className="bg-sand-50 px-4 py-2.5 text-xs font-black text-navy-900">{chapter}</h2>
                <ul className="divide-y divide-ink-900/5">
                  {lessons.filter((lesson) => lesson.chapter === chapter).map((lesson) => {
                    const active = current.id === lesson.id;
                    return (
                      <li key={lesson.id}>
                        <Link href={`/dashboard/classes/${slug}?lesson=${lesson.id}`} className={`flex items-center gap-2.5 px-4 py-3 transition-colors hover:bg-sand-50 ${active ? "bg-teal-50/70" : ""}`}>
                          {lesson.videoId ? <PlayCircle className="h-4 w-4 shrink-0 text-teal-700" /> : <Lock className="h-4 w-4 shrink-0 text-ink-300" />}
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm ${active ? "font-black text-navy-900" : "font-semibold text-ink-700"}`}>{toFa(lesson.order)}. {lesson.title}</span>
                            <span className="text-[11px] text-ink-500">{toFa(lesson.durationMin)} دقیقه{lesson.attachments?.length ? ` • ${toFa(lesson.attachments.length)} فایل` : ""}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}
