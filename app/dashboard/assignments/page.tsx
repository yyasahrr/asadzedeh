import type { Metadata } from "next";
import { CheckCircle2, Download, Upload, XCircle } from "lucide-react";
import { dashboardStudent } from "@/lib/data";
import { getSubmissions } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { submitAssignment } from "@/app/actions";

export const metadata: Metadata = { title: "تمرین‌ها" };

const errorMessages: Record<string, string> = {
  empty: "فایلی انتخاب نشده است.",
  type: "فقط تصویر، PDF یا ZIP مجاز است.",
  size: "حجم فایل بیش از ۱۰ مگابایت است.",
};

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  const student = user?.name ?? dashboardStudent.name;
  const { sent, error } = await searchParams;
  const subs = getSubmissions().filter((s) => s.student === student);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">تمرین‌ها</h1>

      {sent && (
        <p className="flex items-center gap-2 rounded-2xl bg-teal-50 px-5 py-3.5 text-sm font-bold text-teal-800 ring-1 ring-teal-600/25 ring-inset">
          <CheckCircle2 className="h-5 w-5" />
          تمرین شما ارسال شد و در وضعیت «در حال بررسی» قرار گرفت.
        </p>
      )}
      {error && errorMessages[error] && (
        <p className="flex items-center gap-2 rounded-2xl bg-madder-50 px-5 py-3.5 text-sm font-bold text-madder-700 ring-1 ring-madder-700/25 ring-inset">
          <XCircle className="h-5 w-5" />
          {errorMessages[error]}
        </p>
      )}

      <div className="space-y-4">
        {dashboardStudent.assignments.map((a) => {
          const sub = subs.find((s) => s.assignment === a.title);
          const status = sub?.status ?? "در انتظار ارسال";
          const locked = status === "تأیید شده";
          return (
            <article key={a.title} className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-navy-900">{a.title}</h2>
                  <p className="mt-1 text-[13px] text-ink-500">{a.course} • مهلت: {a.due}</p>
                </div>
                <StatusBadge status={status} />
              </div>

              {sub && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-sand-50 px-4 py-3 text-sm ring-1 ring-ink-900/5">
                  <a href={sub.file} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-navy-800 hover:underline">
                    <Download className="h-4 w-4" />
                    مشاهده فایل ارسالی ({sub.date})
                  </a>
                  {sub.note && <span className="text-[13px] text-ink-600">یادداشت استاد: {sub.note}</span>}
                </div>
              )}

              {!locked && (
                <form action={submitAssignment} className="mt-3 flex flex-col gap-2 border-t border-dashed border-ink-900/10 pt-4 sm:flex-row sm:items-center">
                  <input type="hidden" name="assignment" value={a.title} />
                  <input type="hidden" name="course" value={a.course} />
                  <label htmlFor={`file-${a.due}`} className="sr-only">فایل تمرین</label>
                  <input
                    id={`file-${a.due}`}
                    name="file"
                    type="file"
                    required
                    accept="image/*,.pdf,.zip"
                    className="min-w-0 flex-1 cursor-pointer rounded-xl border border-ink-900/10 bg-white px-3 py-2.5 text-sm file:ms-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-sand-200 file:px-3 file:py-1.5 file:text-[13px] file:font-bold"
                  />
                  <button type="submit" className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-navy-800 px-5 text-sm font-bold whitespace-nowrap text-white transition-colors hover:bg-navy-700">
                    <Upload className="h-4 w-4" />
                    {sub ? "ارسال مجدد" : "ارسال تمرین"}
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </div>

      <p className="rounded-2xl bg-teal-50 p-4 text-sm leading-7 text-teal-800 ring-1 ring-teal-600/20 ring-inset">
        راهنما: از اثر خود در نور روز عکس بگیرید (حداقل ۳ عکس: کلی، جزئیات بافت و پشت کار) یا همه را در یک فایل ZIP ارسال کنید.
      </p>
    </div>
  );
}
