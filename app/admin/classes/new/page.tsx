import type { Metadata } from "next";
import Link from "next/link";
import { createClass } from "../../actions";
import { ClassForm } from "@/components/admin/ClassForm";

export const metadata: Metadata = { title: "کلاس جدید" };

export default function NewClassPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-ink-500">نوع آموزش</p>
          <h1 className="mt-1 text-2xl font-black text-navy-900">دوره حضوری جدید</h1>
        </div>
        <nav className="flex rounded-xl bg-sand-100 p-1 text-sm font-bold" aria-label="انتخاب نوع دوره">
          <Link href="/admin/courses/new" className="rounded-lg px-4 py-2 text-ink-600 hover:bg-white hover:text-navy-900">آنلاین</Link>
          <span className="rounded-lg bg-navy-800 px-4 py-2 text-white">حضوری</span>
        </nav>
      </div>
      <ClassForm action={createClass} submitLabel="انتشار کلاس" />
    </div>
  );
}
