"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Circle, Download, ExternalLink, FileText, Key, Loader2 } from "lucide-react";
import { SecurePlayer } from "@/components/video/SecurePlayer";
import { setLessonProgress, touchLesson } from "@/app/dashboard/actions";
import { toFa } from "@/lib/format";
import type { LessonAttachment } from "@/lib/types";

interface LessonLite {
  id: string;
  title: string;
  description?: string;
  durationMin: number;
  videoId?: string;
  videoReady: boolean;
  attachments?: LessonAttachment[];
}

export function LessonPlayer({
  courseSlug,
  lesson,
  poster,
  initiallyCompleted = false,
  progressEnabled = true,
  spotLicense,
}: {
  courseSlug?: string;
  lesson: LessonLite;
  poster: string;
  initiallyCompleted?: boolean;
  progressEnabled?: boolean;
  spotLicense?: { key: string; url: string };
}) {
  const [done, setDone] = useState(initiallyCompleted);
  const [pending, start] = useTransition();
  const [autoMarked, setAutoMarked] = useState(false);

  // The parent renders this component with key={lesson.id}, so local state resets per lesson.
  useEffect(() => {
    if (progressEnabled && courseSlug) void touchLesson(courseSlug, lesson.id);
  }, [courseSlug, lesson.id, progressEnabled]);

  const toggle = (value: boolean) => {
    if (!courseSlug) return;
    const slug = courseSlug;
    start(async () => {
      const r = await setLessonProgress(slug, lesson.id, value);
      if (r.ok) setDone(value);
    });
  };

  return (
    <div className="space-y-4">
      {lesson.videoId && lesson.videoReady ? (
        <SecurePlayer
          videoId={lesson.videoId}
          poster={poster}
          onProgress={progressEnabled ? (pct) => {
            if (pct >= 90 && !done && !autoMarked) {
              setAutoMarked(true);
              toggle(true);
            }
          } : undefined}
        />
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl bg-navy-900 text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin text-ochre-200" />
          <p className="font-bold">{lesson.videoId ? "ویدیوی این جلسه در حال پردازش است" : "ویدیوی این جلسه هنوز منتشر نشده"}</p>
          <p className="text-xs text-white/60">به‌محض آماده‌شدن، همین‌جا نمایش داده می‌شود.</p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-navy-900">{lesson.title}</h2>
          <p className="mt-1 text-xs text-ink-500">{toFa(lesson.durationMin)} دقیقه</p>
          {lesson.description && <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-700">{lesson.description}</p>}
        </div>
        {progressEnabled ? (
          <button
            type="button"
            onClick={() => toggle(!done)}
            disabled={pending}
            className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${done ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-sand-200 text-ink-700 hover:bg-sand-300"}`}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            {done ? "تکمیل شد" : "علامت‌گذاری به‌عنوان تکمیل‌شده"}
          </button>
        ) : null}
      </div>

      {lesson.attachments?.length ? (
        <section className="rounded-xl border border-ink-900/8 bg-card p-4" aria-labelledby="lesson-files-title">
          <h3 id="lesson-files-title" className="flex items-center gap-2 text-sm font-black text-navy-900">
            <FileText className="h-4 w-4 text-teal-700" /> فایل‌های این درس
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {lesson.attachments.map((attachment) => (
              <li key={attachment.path}>
                <a
                  href={attachment.path}
                  className="flex min-h-11 items-center gap-2 rounded-lg bg-sand-100 px-3 text-sm font-bold text-ink-700 transition-colors hover:bg-sand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  <Download className="h-4 w-4 shrink-0 text-teal-700" />
                  <span className="min-w-0 flex-1 truncate">{attachment.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {spotLicense && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy-50 p-4 text-sm ring-1 ring-navy-800/10">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-navy-700" />
            <span>تماشا در اپلیکیشن اسپات‌پلیر: کلید لایسنس <code className="rounded bg-white px-1.5 py-0.5 text-xs" dir="ltr">{spotLicense.key}</code></span>
          </div>
          <a href={spotLicense.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-teal-700 hover:underline">
            دریافت <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
