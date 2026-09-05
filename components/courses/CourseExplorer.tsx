"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import type { OnlineCourse } from "@/lib/types";
import { toFa } from "@/lib/format";
import { CourseCard } from "../cards/CourseCard";
import { cn } from "@/lib/utils";

const categories = ["همه", "فرش‌بافی", "گلیم‌بافی", "گبه‌بافی", "رنگرزی", "مرمت", "طراحی"];
const levels = ["همه سطوح", "مقدماتی", "متوسط", "پیشرفته"];

export function CourseExplorer({ courses }: { courses: OnlineCourse[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("همه");
  const [level, setLevel] = useState("همه سطوح");

  const filtered = useMemo(
    () =>
      courses.filter(
        (c) =>
          (cat === "همه" || c.category === cat) &&
          (level === "همه سطوح" || c.level === level) &&
          (q.trim() === "" || c.title.includes(q.trim()) || c.excerpt.includes(q.trim()))
      ),
    [courses, q, cat, level]
  );

  return (
    <div>
      <div className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5 sm:p-5">
        <div className="relative">
          <Search className="absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden />
          <label htmlFor="course-search" className="sr-only">جست‌وجو در دوره‌ها</label>
          <input
            id="course-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جست‌وجو: مثلاً گلیم، رنگرزی، مرمت…"
            className="h-12 w-full rounded-xl border border-ink-900/10 bg-sand-50 pr-12 pl-4 text-[15px] placeholder:text-ink-400 focus:border-teal-600 focus:outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={cn(
                "cursor-pointer rounded-full px-4 py-2 text-sm font-bold transition-colors",
                cat === c ? "bg-navy-800 text-white" : "bg-sand-100 text-ink-700 hover:bg-sand-200"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-dashed border-ink-900/10 pt-3">
          <span className="text-[13px] font-bold text-ink-500">سطح:</span>
          {levels.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              aria-pressed={level === l}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors",
                level === l ? "bg-teal-600 text-white" : "text-ink-600 hover:bg-sand-100"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 mb-4 text-sm text-ink-600" role="status">
        <strong className="text-navy-900">{toFa(filtered.length)} دوره</strong> پیدا شد
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-16 text-center shadow-card ring-1 ring-ink-900/5">
          <SearchX className="h-10 w-10 text-ink-300" aria-hidden />
          <p className="font-extrabold text-navy-900">دوره‌ای با این مشخصات پیدا نشد</p>
          <p className="text-sm text-ink-500">عبارت دیگری را امتحان کنید یا فیلترها را بردارید.</p>
          <button
            type="button"
            onClick={() => { setQ(""); setCat("همه"); setLevel("همه سطوح"); }}
            className="mt-2 cursor-pointer rounded-xl bg-sand-200 px-5 py-2.5 text-sm font-bold text-ink-800 transition-colors hover:bg-sand-300"
          >
            حذف فیلترها
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}
