import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import { getCourses } from "@/lib/store";
import { formatPriceCompact, toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteCourse } from "../actions";

export const metadata: Metadata = { title: "مدیریت دوره‌ها" };

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const filtered = getCourses().filter(
    (c) => q.trim() === "" || c.title.includes(q.trim()) || c.category.includes(q.trim())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">دوره‌ها</h1>
        <Link href="/admin/courses/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700">
          <Plus className="h-4 w-4" />
          دوره جدید
        </Link>
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
              <span className="flex items-center gap-1">
                <Link
                  href={`/admin/courses/${c.slug}/edit`}
                  aria-label={`ویرایش ${c.shortTitle}`}
                  title="ویرایش"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-800 transition-colors hover:bg-navy-50"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <DeleteButton action={deleteCourse} hidden={{ name: "slug", value: c.slug }} label={c.shortTitle} />
              </span>
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
