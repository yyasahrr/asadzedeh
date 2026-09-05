import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { onlineCourses } from "@/lib/data";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const metadata: Metadata = { title: "دوره‌های من" };

const enrolled = [
  { course: onlineCourses[5], progress: 68, lesson: "درس ۹: ایجاد بافت برجسته" },
  { course: onlineCourses[0], progress: 34, lesson: "درس ۵: گره فارسی" },
  { course: onlineCourses[2], progress: 82, lesson: "درس ۱۳: نیل و خم آبی" },
];

export default function MyCoursesPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">دوره‌های من</h1>
      {enrolled.map(({ course, progress, lesson }) => (
        <article key={course.slug} className="grid gap-4 rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-[180px_1fr_auto] sm:items-center">
          <div className="relative h-32 overflow-hidden rounded-xl sm:h-full sm:min-h-28">
            <Image src={course.image} alt={course.title} fill sizes="200px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <h2 className="leading-7 font-extrabold text-navy-900">{course.title}</h2>
            <p className="mt-1 text-[13px] text-ink-500">{lesson}</p>
            <ProgressBar value={progress} showLabel className="mt-3 max-w-sm" />
          </div>
          <Link href="/dashboard" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold whitespace-nowrap text-white transition-colors hover:bg-navy-700">
            <PlayCircle className="h-4 w-4" />
            ادامه یادگیری
          </Link>
        </article>
      ))}
    </div>
  );
}
