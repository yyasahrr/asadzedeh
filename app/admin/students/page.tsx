import type { Metadata } from "next";
import { Search } from "lucide-react";
import { toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "هنرجویان" };

const students = [
  { name: "سارا محمدی", phone: "09123456789", courses: 3, joinDate: "تیر ۱۴۰۵", status: "فعال" },
  { name: "حسین احمدی", phone: "09129876543", courses: 2, joinDate: "مرداد ۱۴۰۵", status: "فعال" },
  { name: "نگار رضایی", phone: "09351234567", courses: 2, joinDate: "خرداد ۱۴۰۵", status: "فعال" },
  { name: "لیلا کریمی", phone: "09127654321", courses: 1, joinDate: "شهریور ۱۴۰۵", status: "فعال" },
  { name: "امیر حسینی", phone: "09201112233", courses: 1, joinDate: "مرداد ۱۴۰۵", status: "در انتظار پرداخت" },
  { name: "مریم صادقی", phone: "09193334455", courses: 4, joinDate: "اردیبهشت ۱۴۰۵", status: "فعال" },
];

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const filtered = students.filter((s) => q.trim() === "" || s.name.includes(q.trim()));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">هنرجویان</h1>
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
      <TableShell head={["نام", "موبایل", "تعداد دوره", "عضویت", "وضعیت"]}>
        {filtered.map((s) => (
          <tr key={s.phone} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-900">{s.name}</Td>
            <Td><span dir="ltr" className="text-ink-600">{s.phone}</span></Td>
            <Td className="font-bold">{toFa(s.courses)}</Td>
            <Td className="text-ink-600">{s.joinDate}</Td>
            <Td><StatusBadge status={s.status} /></Td>
          </tr>
        ))}
      </TableShell>
      {filtered.length === 0 && (
        <p className="rounded-2xl bg-card p-8 text-center text-sm text-ink-500 shadow-card">هنرجویی پیدا نشد.</p>
      )}
    </div>
  );
}
