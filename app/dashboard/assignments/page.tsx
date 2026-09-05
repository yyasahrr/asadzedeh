import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { dashboardStudent } from "@/lib/data";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "تمرین‌ها" };

export default function AssignmentsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">تمرین‌ها</h1>
      <div className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
        <ul className="divide-y divide-ink-900/5">
          {dashboardStudent.assignments.map((a) => (
            <li key={a.title} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-extrabold text-navy-900">{a.title}</p>
                <p className="mt-1 text-[13px] text-ink-500">{a.course} • مهلت: {a.due}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} />
                {a.status === "در انتظار ارسال" && (
                  <button type="button" className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-navy-800 px-4 text-[13px] font-bold text-white transition-colors hover:bg-navy-700">
                    <Upload className="h-4 w-4" />
                    ارسال تمرین
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="rounded-2xl bg-teal-50 p-4 text-sm leading-7 text-teal-800 ring-1 ring-teal-600/20 ring-inset">
        راهنما: از اثر خود در نور روز عکس بگیرید (حداقل ۳ عکس: کلی، جزئیات بافت و پشت کار) و در قالب یک فایل ارسال کنید.
      </p>
    </div>
  );
}
