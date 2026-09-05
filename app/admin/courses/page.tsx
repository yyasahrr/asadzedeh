import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { onlineCourses } from "@/lib/data";
import { formatPriceCompact, toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";

export const metadata: Metadata = { title: "مدیریت دوره‌ها" };

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const filtered = onlineCourses.filter(
    (c) => q.trim() === "" || c.title.includes(q.trim()) || c.category.includes(q.trim())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">دوره‌ها</h1>
        <button type="button" className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700">
          <Plus className="h-4 w-4" />
          دوره جدید
        </button>
      </div>

      <form className="relative" role="search">
        <Search className="absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <label htmlFor="admin-course-q" className="sr-only">جست‌وجو در دوره‌ها</label>
        <input
          id="admin-course-q"
          name="q"
          defaultValue={q}
          placeholder="جست‌وجو در عنوان یا دسته…"
          className="h-11 w-full rounded-xl border border-ink-900/10 bg-card pr-11 pl-4 text-sm focus:border-teal-600 focus:outline-none"
        />
      </form>

      <TableShell head={["دوره", "دسته", "سطح", "هنرجو", "قیمت", "عملیات"]}>
        {filtered.map((c) => (
          <tr key={c.slug} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-900">{c.shortTitle}</Td>
            <Td className="text-ink-600">{c.category}</Td>
            <Td className="text-ink-600">{c.level}</Td>
            <Td className="font-bold">{toFa(c.students)}</Td>
            <Td className="font-bold whitespace-nowrap">{formatPriceCompact(c.price)}</Td>
            <Td>
              <Link href={`/courses/${c.slug}`} className="font-bold text-teal-600 hover:text-teal-700">
                مشاهده
              </Link>
            </Td>
          </tr>
        ))}
      </TableShell>
      {filtered.length === 0 && (
        <p className="rounded-2xl bg-card p-8 text-center text-sm text-ink-500 shadow-card">نتیجه‌ای پیدا نشد.</p>
      )}
    </div>
  );
}
