import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, Eye, Pencil, Video } from "lucide-react";
import {
  addClassChapter,
  addClassLesson,
  deleteClassChapter,
  deleteClassLesson,
  moveClassChapter,
  moveClassLesson,
  updateClassChapter,
  updateClassLesson,
} from "../../../actions";
import { Denied } from "@/components/admin/Denied";
import { LessonManager } from "@/components/admin/LessonManager";
import { SecurePlayer } from "@/components/video/SecurePlayer";
import { can, getSessionUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { getClass, getVideos } from "@/lib/store";

export const metadata: Metadata = { title: "محتوای کلاس حضوری" };
export const dynamic = "force-dynamic";

export default async function ClassLessonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string; edit?: string; preview?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !can(user, "classes")) return <Denied />;
  const { slug } = await params;
  const { created, edit, preview } = await searchParams;
  const inPersonClass = getClass(slug);
  if (!inPersonClass) notFound();

  const videos = getVideos();
  const lessons = inPersonClass.lessons ?? [];
  const editing = edit ? lessons.find((lesson) => lesson.id === edit) : undefined;
  const previewVideo = preview ? videos.find((video) => video.id === preview) : undefined;
  const totalMinutes = lessons.reduce((sum, lesson) => sum + lesson.durationMin, 0);
  const connectedVideos = lessons.filter(
    (lesson) => lesson.videoId && videos.some((video) => video.id === lesson.videoId),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-500">
            <Link href="/admin/classes" className="hover:text-teal-700">کلاس‌های حضوری</Link> / {inPersonClass.title}
          </p>
          <h1 className="mt-1 text-2xl font-black text-navy-900">فصل‌ها و محتوای کلاس</h1>
          <p className="mt-1 text-sm text-ink-600">
            {toFa(lessons.length)} درس • {toFa(connectedVideos)} ویدیوی متصل • {toFa(totalMinutes)} دقیقه محتوای تکمیلی
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/classes/${slug}`} target="_blank" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300">
            <Eye className="h-4 w-4" /> صفحه عمومی
          </Link>
          <Link href={`/admin/classes/${slug}/edit`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-800 px-4 text-sm font-bold text-white hover:bg-navy-700">
            <Pencil className="h-4 w-4" /> ویرایش مشخصات
          </Link>
        </div>
      </div>

      {created ? (
        <div className="flex items-start gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900 ring-1 ring-teal-700/10">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p><strong>کلاس ساخته شد.</strong> اکنون نام فصل را وارد کنید، درس‌های آن را بسازید و برای هر درس ویدیو، توضیحات و فایل قرار دهید.</p>
        </div>
      ) : null}

      {previewVideo ? (
        <section className="rounded-xl bg-card p-4 ring-1 ring-ink-900/8" aria-label="پیش‌نمایش ویدیو">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-black text-navy-900">
              <Video className="h-4 w-4 text-teal-700" /> پیش‌نمایش: {previewVideo.title}
            </h2>
            <Link href={`/admin/classes/${slug}/lessons`} className="text-xs font-bold text-ink-500 hover:text-ink-800">بستن</Link>
          </div>
          <div className="mx-auto max-w-3xl">
            <SecurePlayer videoId={previewVideo.id} poster={inPersonClass.image} />
          </div>
        </section>
      ) : null}

      <LessonManager
        course={inPersonClass}
        videos={videos}
        basePath={`/admin/classes/${slug}/lessons`}
        editing={editing}
        actions={{ add: addClassLesson, update: updateClassLesson, remove: deleteClassLesson, move: moveClassLesson }}
        chapterActions={{ add: addClassChapter, update: updateClassChapter, remove: deleteClassChapter, move: moveClassChapter }}
        videoLibraryHref="/admin/videos"
      />
    </div>
  );
}
