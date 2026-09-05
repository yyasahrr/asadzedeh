import type { Metadata } from "next";
import Link from "next/link";
import { Award, ExternalLink, Plus } from "lucide-react";
import { getCertificates, getCourses, getStudents } from "@/lib/store";
import { toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import { deleteCertificate, issueCertificate } from "../actions";

export const metadata: Metadata = { title: "گواهی‌ها" };

export default function AdminCertificatesPage() {
  const certs = getCertificates();
  const students = getStudents();
  const courses = getCourses();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">گواهی‌های پایان دوره</h1>

      <details className="group rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5" open>
        <summary className="flex cursor-pointer items-center gap-2 p-4 font-extrabold text-navy-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ochre-600 text-white transition-transform group-open:rotate-45">
            <Plus className="h-4 w-4" />
          </span>
          صدور گواهی جدید
        </summary>
        <form action={issueCertificate} className="grid gap-4 border-t border-dashed border-ink-900/10 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel htmlFor="c-student">نام هنرجو *</FieldLabel>
            <Input id="c-student" name="student" required list="student-list" placeholder="نام هنرجو" />
            <datalist id="student-list">
              {students.map((s) => (
                <option key={s.phone + s.name} value={s.name} />
              ))}
            </datalist>
          </div>
          <div>
            <FieldLabel htmlFor="c-course">دوره *</FieldLabel>
            <Select id="c-course" name="course" required defaultValue={courses[0]?.shortTitle ?? ""}>
              {courses.map((c) => (
                <option key={c.slug} value={c.shortTitle}>{c.shortTitle}</option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="c-date">تاریخ صدور</FieldLabel>
            <Input id="c-date" name="date" defaultValue="شهریور ۱۴۰۵" />
          </div>
          <div>
            <FieldLabel htmlFor="c-hours">مدت دوره (ساعت)</FieldLabel>
            <Input id="c-hours" name="hours" inputMode="numeric" defaultValue="12" />
          </div>
          <div>
            <FieldLabel htmlFor="c-code">کد گواهی (خالی = خودکار)</FieldLabel>
            <Input id="c-code" name="code" dir="ltr" className="text-left" placeholder="AZ-C-1205" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ochre-600 px-6 text-sm font-bold text-white transition-colors hover:bg-ochre-500">
              <Award className="h-4 w-4" />
              صدور گواهی
            </button>
          </div>
        </form>
      </details>

      <TableShell head={["کد", "هنرجو", "دوره", "تاریخ", "ساعت", "عملیات"]}>
        {certs.map((c) => (
          <tr key={c.code} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-800"><span dir="ltr">{c.code}</span></Td>
            <Td className="font-semibold">{c.student}</Td>
            <Td className="text-ink-600">{c.course}</Td>
            <Td className="whitespace-nowrap text-ink-600">{c.date}</Td>
            <Td className="font-bold">{toFa(c.hours)}</Td>
            <Td>
              <span className="flex items-center gap-1">
                <Link
                  href={`/verify/${encodeURIComponent(c.code)}`}
                  aria-label={`مشاهده گواهی ${c.code}`}
                  title="مشاهده و استعلام"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-teal-700 transition-colors hover:bg-teal-50"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <DeleteButton action={deleteCertificate} hidden={{ name: "code", value: c.code }} label={c.code} />
              </span>
            </Td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}
