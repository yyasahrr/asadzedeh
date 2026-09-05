import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, ExternalLink, FileText, Video } from "lucide-react";
import { instructorAddLesson, instructorDeleteLesson, instructorMoveLesson, instructorUpdateCourseText, instructorUpdateLesson } from "../../actions";
import { LessonManager } from "@/components/admin/LessonManager";
import { SecurePlayer } from "@/components/video/SecurePlayer";
import { FieldLabel, Textarea } from "@/components/ui/Input";
import { getSessionUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { getCourse, getEnrollments, getInstructorByUser, getVideos } from "@/lib/store";

export const metadata: Metadata = { title: "مدیریت دوره" };
export const dynamic = "force-dynamic";

export default async function InstructorCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string; preview?: string; saved?: string }>;
}) {
  const user = (await getSessionUser())!;
  const inst = getInstructorByUser(user.id)!;
  const { slug } = await params;
  const { edit, preview, saved } = await searchParams;
  const course = getCourse(slug);
  if (!course || course.instructorSlug !== inst.slug) notFound();
  const videos = getVideos();
  const lessons = course.lessons ?? [];
  const editing = edit ? lessons.find((l) => l.id === edit) : undefined;
  const previewVideo = preview ? videos.find((v) => v.id === preview) : undefined;
  const students = getEnrollments().filter((e) => e.courseSlug === slug).length;
  const base = `/instructor/courses/${slug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-500">
            <Link href="/instructor/courses" className="hover:text-teal-700">دوره‌های من</Link> / {course.shortTitle}
          </p>
          <h1 className="mt-1 text-2xl font-black text-navy-900">{course.title}</h1>
          <p className="mt-1 text-sm text-ink-600">{toFa(lessons.length)} جلسه • {toFa(students)} هنرجو • {toFa(course.hours)} ساعت</p>
        </div>
        <Link href={`/courses/${slug}`} target="_blank" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300">
          <ExternalLink className="h-4 w-4" /> صفحه عمومی
        </Link>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
          <CircleCheck className="h-4 w-4" /> تغییرات ذخیره شد.
        </div>
      )}

      {previewVideo && (
        <div className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-black text-navy-900"><Video className="h-4 w-4 text-teal-700" /> پیش‌نمایش: {previewVideo.title}</h2>
            <Link href={base} className="text-xs font-bold text-ink-500 hover:text-ink-800">بستن</Link>
          </div>
          <div className="mx-auto max-w-3xl">
            <SecurePlayer videoId={previewVideo.id} poster={course.image} />
          </div>
        </div>
      )}

      <LessonManager
        course={course}
        videos={videos}
        basePath={base}
        editing={editing}
        actions={{ add: instructorAddLesson, update: instructorUpdateLesson, remove: instructorDeleteLesson, move: instructorMoveLesson }}
      />

      <form action={instructorUpdateCourseText} className="grid gap-4 rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
        <h2 className="flex items-center gap-2 font-black text-navy-900"><FileText className="h-5 w-5 text-teal-700" /> متن معرفی دوره</h2>
        <input type="hidden" name="slug" value={slug} />
        <div>
          <FieldLabel htmlFor="c-excerpt">معرفی کوتاه</FieldLabel>
          <Textarea id="c-excerpt" name="excerpt" defaultValue={course.excerpt} />
        </div>
        <div>
          <FieldLabel htmlFor="c-outcomes">دستاوردها (هر خط یک مورد)</FieldLabel>
          <Textarea id="c-outcomes" name="outcomes" defaultValue={course.outcomes.join("\n")} />
        </div>
        <div>
          <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 text-sm font-bold text-white hover:bg-navy-700">ذخیره متن</button>
        </div>
      </form>
    </div>
  );
}
