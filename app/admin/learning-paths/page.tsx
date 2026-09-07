import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import { getLearningPaths } from "@/lib/store";
import { TableShell, Td } from "@/components/admin/TableShell";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteLearningPath } from "../actions";

export const metadata: Metadata = { title: "مسیرهای آموزشی" };
export const dynamic = "force-dynamic";

export default async function AdminLearningPathsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const filtered = getLearningPaths().filter(
    (p) => q.trim() === "" || p.title.includes(q.trim())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">مسیرهای آموزشی</h1>
        <Link
          href="/admin/learning-paths/new"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700"
        >
          <Plus className="h-4 w-4" />
          مسیر جدید
        </Link>
      </div>

      <form className="relative" role="search">
        <Search className="absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <label htmlFor="admin-path-q" className="sr-only">جست‌وجو در مسیرها</label>
        <input
          id="admin-path-q"
          name="q"
          defaultValue={q}
          placeholder="جست‌وجو در عنوان…"
          className="h-11 w-full rounded-xl border border-ink-900/10 bg-card pr-11 pl-4 text-sm focus:border-teal-600 focus:outline-none"
        />
      </form>

      <TableShell head={["مسیر", "تعداد دوره", "مدت", "وضعیت", "عملیات"]}>
        {filtered.map((p) => (
          <tr key={p.slug} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-900">{p.title}</Td>
            <Td>{p.pathCourses.length}</Td>
            <Td>{p.duration}</Td>
            <Td>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${p.active ? "bg-teal-50 text-teal-700" : "bg-ink-100 text-ink-500"}`}>
                {p.active ? "فعال" : "غیرفعال"}
              </span>
            </Td>
            <Td>
              <span className="flex items-center gap-1">
                <Link
                  href={`/admin/learning-paths/${p.slug}/edit`}
                  aria-label={`ویرایش ${p.title}`}
                  title="ویرایش"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-800 transition-colors hover:bg-navy-50"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <DeleteButton
                  action={deleteLearningPath}
                  hidden={{ name: "slug", value: p.slug }}
                  label={p.title}
                />
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
