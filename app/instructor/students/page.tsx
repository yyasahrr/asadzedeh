import type { Metadata } from "next";
import { ClipboardCheck, Users } from "lucide-react";
import { instructorReviewSubmission } from "../actions";
import { TableShell, Td } from "@/components/admin/TableShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getSessionUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { getCourses, getEnrollments, getInstructorByUser, getSubmissions, getUsers } from "@/lib/store";

export const metadata: Metadata = { title: "هنرجویان و تمرین‌ها" };
export const dynamic = "force-dynamic";

export default async function InstructorStudentsPage() {
  const user = (await getSessionUser())!;
  const inst = getInstructorByUser(user.id)!;
  const courses = getCourses().filter((c) => c.instructorSlug === inst.slug);
  const bySlug = new Map(courses.map((c) => [c.slug, c]));
  const titles = new Set(courses.flatMap((c) => [c.title, c.shortTitle]));
  const users = new Map(getUsers().map((u) => [u.id, u]));
  const enrollments = getEnrollments().filter((e) => bySlug.has(e.courseSlug));
  const submissions = getSubmissions().filter((s) => titles.has(s.course));
  const pending = submissions.filter((s) => s.status === "در حال بررسی");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-navy-900">هنرجویان و تمرین‌ها</h1>
        <p className="mt-1 text-sm text-ink-600">{toFa(enrollments.length)} ثبت‌نام • {toFa(pending.length)} تمرین منتظر بررسی</p>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-black text-navy-900"><ClipboardCheck className="h-5 w-5 text-teal-700" /> تمرین‌های ارسال‌شده</h2>
        <TableShell head={["هنرجو", "دوره", "تمرین", "تاریخ", "وضعیت", "بررسی"]}>
          {submissions.length === 0 && (
            <tr><Td colSpan={6} className="text-center text-sm text-ink-500">تمرینی برای دوره‌های شما ارسال نشده است.</Td></tr>
          )}
          {submissions.map((s) => (
            <tr key={s.id} className="align-top">
              <Td className="text-sm font-bold text-ink-900">{s.student}</Td>
              <Td className="text-sm text-ink-700">{s.course}</Td>
              <Td className="text-sm text-ink-700">
                {s.assignment}
                <br />
                <a href={s.file} target="_blank" rel="noreferrer" className="text-xs font-bold text-teal-700 hover:underline">مشاهده فایل</a>
              </Td>
              <Td className="text-xs text-ink-500 whitespace-nowrap">{s.date}</Td>
              <Td><StatusBadge status={s.status} /></Td>
              <Td>
                <form action={instructorReviewSubmission} className="flex min-w-[220px] flex-col gap-2">
                  <input type="hidden" name="id" value={s.id} />
                  <input name="note" defaultValue={s.note} placeholder="بازخورد برای هنرجو…" className="h-9 rounded-lg border border-ink-900/10 bg-white px-2 text-xs focus:border-teal-600 focus:outline-none" />
                  <div className="flex gap-1.5">
                    <button type="submit" name="status" value="تأیید شده" className="h-8 flex-1 cursor-pointer rounded-lg bg-teal-700 text-[11px] font-bold text-white hover:bg-teal-800">تأیید</button>
                    <button type="submit" name="status" value="نیاز به اصلاح" className="h-8 flex-1 cursor-pointer rounded-lg bg-ochre-500 text-[11px] font-bold text-white hover:bg-ochre-600">نیاز به اصلاح</button>
                  </div>
                </form>
              </Td>
            </tr>
          ))}
        </TableShell>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-black text-navy-900"><Users className="h-5 w-5 text-teal-700" /> هنرجویان ثبت‌نام‌شده</h2>
        <TableShell head={["هنرجو", "دوره", "تاریخ ثبت‌نام", "پیشرفت", "اسپات‌پلیر"]}>
          {enrollments.length === 0 && (
            <tr><Td colSpan={5} className="text-center text-sm text-ink-500">هنوز هنرجویی در دوره‌های شما ثبت‌نام نکرده است.</Td></tr>
          )}
          {enrollments.map((e) => {
            const u = users.get(e.userId);
            const c = bySlug.get(e.courseSlug)!;
            const total = c.lessons?.length ?? 0;
            const pct = total ? Math.round((e.completed.length / total) * 100) : 0;
            return (
              <tr key={e.id}>
                <Td className="text-sm font-bold text-ink-900">
                  {u?.name ?? "—"}
                  <br />
                  <span className="text-xs font-normal text-ink-500" dir="ltr">{u?.phone ? u.phone.replace(/^(\d{4})\d{3}(\d{4})$/, "$1***$2") : ""}</span>
                </Td>
                <Td className="text-sm text-ink-700">{c.shortTitle}</Td>
                <Td className="text-xs text-ink-500 whitespace-nowrap">{e.createdAt}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-sand-200"><div className="h-full bg-teal-600" style={{ width: `${pct}%` }} /></div>
                    <span className="text-xs text-ink-600">{toFa(pct)}٪</span>
                  </div>
                </Td>
                <Td className="text-xs text-ink-600">{e.spotLicense ? "لایسنس صادر شده" : "—"}</Td>
              </tr>
            );
          })}
        </TableShell>
      </section>
    </div>
  );
}
