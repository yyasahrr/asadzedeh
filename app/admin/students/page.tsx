import type { Metadata } from "next";
import { Plus, Search } from "lucide-react";
import { getStudents } from "@/lib/store";
import { toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import { addStudent, deleteStudent } from "../actions";

export const metadata: Metadata = { title: "هنرجویان" };

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const filtered = getStudents().filter((s) => q.trim() === "" || s.name.includes(q.trim()));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">هنرجویان</h1>

      <details className="group rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
        <summary className="flex cursor-pointer items-center gap-2 p-4 font-extrabold text-navy-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white transition-transform group-open:rotate-45">
            <Plus className="h-4 w-4" />
          </span>
          افزودن هنرجو
        </summary>
        <form action={addStudent} className="grid gap-4 border-t border-dashed border-ink-900/10 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <FieldLabel htmlFor="s-name">نام *</FieldLabel>
            <Input id="s-name" name="name" required placeholder="نام و نام خانوادگی" />
          </div>
          <div>
            <FieldLabel htmlFor="s-phone">موبایل</FieldLabel>
            <Input id="s-phone" name="phone" inputMode="tel" dir="ltr" className="text-left" placeholder="09123456789" />
          </div>
          <div>
            <FieldLabel htmlFor="s-courses">تعداد دوره</FieldLabel>
            <Input id="s-courses" name="courses" inputMode="numeric" defaultValue="1" />
          </div>
          <div>
            <FieldLabel htmlFor="s-join">تاریخ عضویت</FieldLabel>
            <Input id="s-join" name="joinDate" defaultValue="شهریور ۱۴۰۵" />
          </div>
          <div>
            <FieldLabel htmlFor="s-status">وضعیت</FieldLabel>
            <Select id="s-status" name="status" defaultValue="فعال">
              <option value="فعال">فعال</option>
              <option value="در انتظار پرداخت">در انتظار پرداخت</option>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-teal-600 px-6 text-sm font-bold text-white transition-colors hover:bg-teal-700">
              ثبت هنرجو
            </button>
          </div>
        </form>
      </details>

      <form className="relative" role="search">
        <Search className="absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <label htmlFor="admin-student-q" className="sr-only">جست‌وجوی هنرجو</label>
        <input
          id="admin-student-q"
          name="q"
          defaultValue={q}
          placeholder="جست‌وجوی نام هنرجو…"
          className="h-11 w-full rounded-xl border border-ink-900/10 bg-card pr-11 pl-4 text-sm focus:border-teal-600 focus:outline-none"
        />
      </form>
      <TableShell head={["نام", "موبایل", "تعداد دوره", "عضویت", "وضعیت", "عملیات"]}>
        {filtered.map((s) => (
          <tr key={s.phone + s.name} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-900">{s.name}</Td>
            <Td><span dir="ltr" className="text-ink-600">{s.phone || "—"}</span></Td>
            <Td className="font-bold">{toFa(s.courses)}</Td>
            <Td className="text-ink-600">{s.joinDate}</Td>
            <Td><StatusBadge status={s.status} /></Td>
            <Td>
              <DeleteButton action={deleteStudent} hidden={{ name: "phone", value: s.phone }} label={s.name} />
            </Td>
          </tr>
        ))}
      </TableShell>
      {filtered.length === 0 && (
        <p className="rounded-2xl bg-card p-8 text-center text-sm text-ink-500 shadow-card">هنرجویی پیدا نشد.</p>
      )}
    </div>
  );
}
