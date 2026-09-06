import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, Eye, Pencil, Video } from "lucide-react";
import { addChapter, addLesson, deleteChapter, deleteLesson, moveChapter, moveLesson, updateChapter, updateLesson } from "../../../actions";
import { Denied } from "@/components/admin/Denied";
import { LessonManager } from "@/components/admin/LessonManager";
import { SecurePlayer } from "@/components/video/SecurePlayer";
import { can, getSessionUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { getCourse, getVideos } from "@/lib/store";

export const metadata: Metadata = { title: "جلسات دوره" };
export const dynamic = "force-dynamic";

export default async function LessonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string; edit?: string; preview?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !can(user, "courses")) return <Denied />;
  const { slug } = await params;
  const { created, edit, preview } = await searchParams;
  const course = getCourse(slug);
  if (!course) notFound();
  const videos = getVideos();
  const lessons = course.lessons ?? [];
  const editing = edit ? lessons.find((l) => l.id === edit) : undefined;
  const previewVideo = preview ? videos.find((v) => v.id === preview) : undefined;
  const totalMin = lessons.reduce((s, l) => s + l.durationMin, 0);
  const withVideo = lessons.filter((l) => l.videoId && videos.some((v) => v.id === l.videoId)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-500">
            <Link href="/admin/courses" className="hover:text-teal-700">دوره‌ها</Link> / {course.shortTitle}
          </p>
          <h1 className="mt-1 text-2xl font-black text-navy-900">جلسات ویدیویی دوره</h1>
          <p className="mt-1 text-sm text-ink-600">
            {toFa(lessons.length)} جلسه • {toFa(withVideo)} ویدیو متصل • مجموع {toFa(totalMin)} دقیقه
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/courses/${slug}`} target="_blank" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300">
            <Eye className="h-4 w-4" /> صفحه عمومی
          </Link>
          <Link href={`/admin/courses/${slug}/edit`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-800 px-4 text-sm font-bold text-white hover:bg-navy-700">
            <Pencil className="h-4 w-4" /> ویرایش مشخصات
          </Link>
        </div>
      </div>

      {created && (
        <div className="flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
          <CircleCheck className="h-4 w-4" /> دوره ساخته شد. حالا جلسات ویدیویی را اضافه کنید.
        </div>
      )}

      {previewVideo && (
        <div className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-black text-navy-900"><Video className="h-4 w-4 text-teal-700" /> پیش‌نمایش: {previewVideo.title}</h2>
            <Link href={`/admin/courses/${slug}/lessons`} className="text-xs font-bold text-ink-500 hover:text-ink-800">بستن</Link>
          </div>
          <div className="mx-auto max-w-3xl">
            <SecurePlayer videoId={previewVideo.id} poster={course.image} />
          </div>
          <p className="mt-2 text-center text-xs text-ink-500">در حالت پیش‌نمایش مدیر، واترمارک شماره نمایش داده نمی‌شود؛ هنرجویان شماره خودشان را روی تصویر می‌بینند.</p>
        </div>
      )}

      <LessonManager
        course={course}
        videos={videos}
        basePath={`/admin/courses/${slug}/lessons`}
        editing={editing}
        actions={{ add: addLesson, update: updateLesson, remove: deleteLesson, move: moveLesson }}
        chapterActions={{ add: addChapter, update: updateChapter, remove: deleteChapter, move: moveChapter }}
        videoLibraryHref="/admin/videos"
      />
    </div>
  );
}
