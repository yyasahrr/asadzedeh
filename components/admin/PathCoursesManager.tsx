"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toFa } from "@/lib/format";

interface CourseOption {
  slug: string;
  shortTitle: string;
  price: number;
}

interface PathCourse {
  courseSlug: string;
  order: number;
  note?: string;
}

interface PathCoursesManagerProps {
  courses: CourseOption[];
  initial: PathCourse[];
  onChange: (value: { courses: PathCourse[]; total: number }) => void;
}

export function PathCoursesManager({
  courses,
  initial,
  onChange,
}: PathCoursesManagerProps) {
  const [rows, setRows] = useState<PathCourse[]>(
    initial.length > 0 ? initial : [{ courseSlug: "", order: 1 }]
  );
  const nextOrder = useRef(initial.length + 1);

  const calculateTotal = useCallback((currentRows: PathCourse[]): number => {
    return currentRows.reduce((sum, row) => {
      if (!row.courseSlug) return sum;
      const course = courses.find((c) => c.slug === row.courseSlug);
      return sum + (course?.price ?? 0);
    }, 0);
  }, [courses]);

  const emit = useCallback(
    (updated: PathCourse[]) => {
      const total = calculateTotal(updated);
      onChange({ courses: updated, total });
    },
    [onChange, calculateTotal]
  );

  useEffect(() => {
    emit(rows);
  }, [rows, emit]);

  const addRow = () => {
    const order = nextOrder.current++;
    setRows((prev) => [...prev, { courseSlug: "", order }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [{ courseSlug: "", order: 1 }] : next;
    });
  };

  const updateSlug = (index: number, slug: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, courseSlug: slug } : r))
    );
  };

  const total = calculateTotal(rows);
  const selectedCourses = rows.filter((r) => r.courseSlug).map((r) => {
    const course = courses.find((c) => c.slug === r.courseSlug);
    return { ...r, course };
  }).filter((r) => r.course);

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-500">
        دوره‌ها را به ترتیب نمایش دهید. اولین دوره = گام اول مسیر.
      </p>
      <div className="space-y-2">
        {rows.map((row, i) => {
          const course = courses.find((c) => c.slug === row.courseSlug);
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                {i + 1}
              </span>
              <select
                value={row.courseSlug}
                onChange={(e) => updateSlug(i, e.target.value)}
                className="h-10 flex-1 rounded-lg border border-ink-900/10 px-3 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="">— انتخاب دوره —</option>
                {courses.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.shortTitle} - {toFa(c.price)} تومان
                  </option>
                ))}
              </select>
              {course && (
                <span className="whitespace-nowrap rounded bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700">
                  {toFa(course.price)} تومان
                </span>
              )}
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="inline-flex h-8 items-center gap-1 rounded-lg bg-navy-50 px-3 text-xs font-bold text-navy-700 transition-colors hover:bg-navy-100"
      >
        + افزودن دوره
      </button>

      {selectedCourses.length > 0 && (
        <div className="rounded-xl bg-sand-50 p-4 ring-1 ring-ink-900/5">
          <p className="mb-2 text-sm font-bold text-navy-800">دوره‌های انتخاب شده:</p>
          <ul className="space-y-1 text-sm">
            {selectedCourses.map((item, i) => (
              <li key={i} className="flex justify-between text-ink-700">
                <span>{i + 1}. {item.course!.shortTitle}</span>
                <span className="font-bold">{toFa(item.course!.price)} تومان</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-ink-900/10 pt-3">
            <span className="text-sm font-bold text-navy-800">مجموع:</span>
            <span className="text-lg font-black text-teal-700">{toFa(total)} تومان</span>
          </div>
        </div>
      )}
    </div>
  );
}
