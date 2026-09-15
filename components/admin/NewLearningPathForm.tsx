"use client";

import { useState } from "react";
import { PathCoursesForm } from "@/components/admin/PathCoursesForm";
import { PathPricingManager } from "@/components/admin/PathPricingManager";
import { createLearningPathAction } from "./createLearningPathAction";

interface CourseOption {
  slug: string;
  shortTitle: string;
  price: number;
}

const ACCENT_OPTIONS = [
  { value: "navy", label: "سرمه‌ای" },
  { value: "teal", label: "سبزآبی" },
  { value: "madder", label: "لاجوردی" },
  { value: "ochre", label: "نارنجی" },
  { value: "moss", label: "سبز" },
] as const;

export function NewLearningPathForm({ courses }: { courses: CourseOption[] }) {
  const [coursesTotal, setCoursesTotal] = useState(0);

  return (
    <form action={createLearningPathAction} className="space-y-5 rounded-2xl bg-card p-6 shadow-card">
      <div>
        <label htmlFor="path-title" className="mb-1 block text-sm font-bold text-navy-800">عنوان</label>
        <input id="path-title" name="title" required className="h-11 w-full rounded-xl border border-ink-900/10 px-4 text-sm focus:border-teal-600 focus:outline-none" />
      </div>

      <div>
        <label htmlFor="path-slug" className="mb-1 block text-sm font-bold text-navy-800">اسلاگ</label>
        <input id="path-slug" name="slug" placeholder="خودکار از عنوان ساخته می‌شود" className="h-11 w-full rounded-xl border border-ink-900/10 px-4 text-sm focus:border-teal-600 focus:outline-none" dir="ltr" />
      </div>

      <div>
        <label htmlFor="path-desc" className="mb-1 block text-sm font-bold text-navy-800">توضیحات</label>
        <textarea id="path-desc" name="description" rows={3} className="w-full rounded-xl border border-ink-900/10 px-4 py-3 text-sm focus:border-teal-600 focus:outline-none" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="path-icon" className="mb-1 block text-sm font-bold text-navy-800">آیکون</label>
          <input id="path-icon" name="icon" defaultValue="📚" className="h-11 w-full rounded-xl border border-ink-900/10 px-4 text-sm focus:border-teal-600 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="path-accent" className="mb-1 block text-sm font-bold text-navy-800">رنگ</label>
          <select id="path-accent" name="accent" className="h-11 w-full rounded-xl border border-ink-900/10 px-4 text-sm focus:border-teal-600 focus:outline-none">
            {ACCENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="path-duration" className="mb-1 block text-sm font-bold text-navy-800">مدت زمان</label>
        <input id="path-duration" name="duration" placeholder="مثلاً: ۴ تا ۵ ماه" className="h-11 w-full rounded-xl border border-ink-900/10 px-4 text-sm focus:border-teal-600 focus:outline-none" />
      </div>

      <fieldset className="rounded-xl border border-ink-900/10 p-4">
        <legend className="px-2 text-sm font-bold text-navy-800">دوره‌های مسیر</legend>
        <PathCoursesForm courses={courses} initial={[]} onTotalChange={setCoursesTotal} />
      </fieldset>

      <fieldset className="rounded-xl border border-ink-900/10 p-4">
        <legend className="px-2 text-sm font-bold text-navy-800">قیمت‌گذاری مسیر</legend>
        <PathPricingManager coursesTotal={coursesTotal} />
      </fieldset>

      <label className="flex items-center gap-2 text-sm font-bold text-navy-800">
        <input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-ink-300 text-teal-600 focus:ring-teal-600" />
        فعال
      </label>

      <div className="flex justify-end">
        <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-8 text-sm font-bold text-white transition-colors hover:bg-teal-700">
          ذخیره
        </button>
      </div>
    </form>
  );
}
