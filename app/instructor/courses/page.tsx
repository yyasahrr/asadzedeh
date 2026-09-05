import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Clapperboard, ExternalLink, Users } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { formatPrice, toFa } from "@/lib/format";
import { getClasses, getCourses, getEnrollments, getInstructorByUser, getVideos } from "@/lib/store";

export const metadata: Metadata = { title: "دوره‌های من" };
export const dynamic = "force-dynamic";

export default async function InstructorCoursesPage() {
  const user = (await getSessionUser())!;
  const inst = getInstructorByUser(user.id)!;
  const courses = getCourses().filter((c) => c.instructorSlug === inst.slug);
  const classes = getClasses().filter((c) => c.instructorSlug === inst.slug);
  const enrollments = getEnrollments();
  const videos = getVideos();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-navy-900">دوره‌های آنلاین من</h1>
        <p className="mt-1 text-sm text-ink-600">جلسات ویدیویی هر دوره را از اینجا مدیریت کنید. قیمت و تنظیمات حفاظت توسط مدیریت تعیین می‌شود.</p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ink-900/10 p-10 text-center text-sm text-ink-500">هنوز دوره‌ای به شما اختصاص داده نشده است.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c) => {
            const ls = c.lessons ?? [];
            const ready = ls.filter((l) => l.videoId && videos.find((v) => v.id === l.videoId)?.status === "ready").length;
            const students = enrollments.filter((e) => e.courseSlug === c.slug).length;
            return (
              <article key={c.slug} className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
                <div className="relative h-40">
                  <Image src={c.image} alt={c.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                  <span className="absolute right-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-bold text-navy-900">{c.category} • {c.level}</span>
                </div>
                <div className="p-5">
                  <h2 className="font-black text-navy-900">{c.title}</h2>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-sand-50 p-2"><p className="font-black text-navy-900">{toFa(ls.length)}</p><p className="text-ink-500">جلسه</p></div>
                    <div className="rounded-xl bg-sand-50 p-2"><p className="font-black text-navy-900">{toFa(ready)}</p><p className="text-ink-500">ویدیو آماده</p></div>
                    <div className="rounded-xl bg-sand-50 p-2"><p className="font-black text-navy-900">{toFa(students)}</p><p className="text-ink-500">هنرجو</p></div>
                  </div>
                  <p className="mt-3 text-xs text-ink-500">قیمت: {formatPrice(c.price)}</p>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/instructor/courses/${c.slug}`} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-navy-800 text-sm font-bold text-white hover:bg-navy-700">
                      <Clapperboard className="h-4 w-4" /> مدیریت جلسات
                    </Link>
                    <Link href={`/courses/${c.slug}`} target="_blank" className="inline-flex h-10 items-center gap-1 rounded-xl bg-sand-200 px-3 text-xs font-bold text-ink-700 hover:bg-sand-300">
                      <ExternalLink className="h-3.5 w-3.5" /> صفحه دوره
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {classes.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-black text-navy-900">کلاس‌های حضوری من</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {classes.map((k) => (
              <li key={k.slug} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
                <Image src={k.image} alt={k.title} width={56} height={56} className="h-14 w-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-900">{k.title}</p>
                  <p className="text-xs text-ink-500">{k.days} {k.time} • شروع {k.startDate}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-ink-600"><Users className="h-3.5 w-3.5" /> {toFa(k.capacity - k.remaining)}/{toFa(k.capacity)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
