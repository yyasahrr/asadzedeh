import type { Metadata } from "next";
import Link from "next/link";
import { createCourse } from "../../actions";
import { CourseForm } from "@/components/admin/CourseForm";

export const metadata: Metadata = { title: "دوره جدید" };

export default function NewCoursePage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-ink-500">نوع آموزش</p>
          <h1 className="mt-1 text-2xl font-black text-navy-900">دوره آنلاین جدید</h1>
        </div>
        <nav className="flex rounded-xl bg-sand-100 p-1 text-sm font-bold" aria-label="انتخاب نوع دوره">
          <span className="rounded-lg bg-navy-800 px-4 py-2 text-white">آنلاین</span>
          <Link href="/admin/classes/new" className="rounded-lg px-4 py-2 text-ink-600 hover:bg-white hover:text-navy-900">حضوری</Link>
        </nav>
      </div>
      <CourseForm action={createCourse} submitLabel="انتشار دوره" />
    </div>
  );
}
