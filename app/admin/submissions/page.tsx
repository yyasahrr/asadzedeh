import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getSubmissions } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Denied } from "@/components/admin/Denied";
import { reviewSubmission } from "../actions";

export const metadata: Metadata = { title: "تمرین‌های هنرجویان" };

const statuses = ["در حال بررسی", "تأیید شده", "نیاز به اصلاح"] as const;

export default async function SubmissionsPage() {
  const user = await getSessionUser();
  if (!can(user, "submissions")) return <Denied />;
  const subs = getSubmissions();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">تمرین‌های ارسالی هنرجویان</h1>
      {subs.length === 0 ? (
        <p className="rounded-2xl bg-card p-10 text-center text-sm text-ink-500 shadow-card">
          هنوز تمرینی ارسال نشده است.
        </p>
      ) : (
        <div className="grid gap-4">
          {subs.map((s) => (
            <article key={s.id} className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-navy-900">{s.assignment}</h2>
                  <p className="mt-1 text-[13px] text-ink-500">
                    {s.student} • {s.course} • {s.date}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <StatusBadge status={s.status} />
                  <a
                    href={s.file}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy-800 px-4 text-[13px] font-bold text-white transition-colors hover:bg-navy-700"
                  >
                    <Download className="h-4 w-4" />
                    دانلود اثر
                  </a>
                </span>
              </div>
              {s.file.match(/\.(png|jpe?g|webp|gif)$/i) && (
                <img src={s.file} alt={s.assignment} className="mt-3 h-40 w-full rounded-xl object-cover ring-1 ring-ink-900/10" loading="lazy" />
              )}
              <form action={reviewSubmission} className="mt-4 flex flex-col gap-2 border-t border-dashed border-ink-900/10 pt-4 sm:flex-row">
                <input type="hidden" name="id" value={s.id} />
                <label htmlFor={`rs-${s.id}`} className="sr-only">وضعیت</label>
                <select
                  id={`rs-${s.id}`}
                  name="status"
                  defaultValue={s.status}
                  className="h-10 cursor-pointer rounded-xl border border-ink-900/10 bg-white px-3 text-sm font-bold focus:border-teal-600 focus:outline-none"
                >
                  {statuses.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <label htmlFor={`rn-${s.id}`} className="sr-only">یادداشت استاد</label>
                <input
                  id={`rn-${s.id}`}
                  name="note"
                  defaultValue={s.note ?? ""}
                  placeholder="یادداشت استاد برای هنرجو (اختیاری)"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-ink-900/10 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none"
                />
                <button type="submit" className="h-10 cursor-pointer rounded-xl bg-teal-600 px-5 text-sm font-bold whitespace-nowrap text-white transition-colors hover:bg-teal-700">
                  ثبت بررسی
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
