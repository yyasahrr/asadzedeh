import type { Metadata } from "next";
import { Award, Download, Lock } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const metadata: Metadata = { title: "گواهی‌ها" };

const certs = [
  { title: "گلیم‌بافی مقدماتی", date: "تیر ۱۴۰۵", code: "AZ-C-1182", locked: false },
  { title: "رنگرزی سنتی", date: "مرداد ۱۴۰۵", code: "AZ-C-1204", locked: false },
  { title: "فرش‌بافی مقدماتی", date: "", code: "", locked: true, progress: 34 },
];

export default function CertificatesPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">گواهی‌ها</h1>
      <div className="grid gap-5 md:grid-cols-2">
        {certs.map((c) => (
          <article key={c.title} className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
            {c.locked ? (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand-200 text-ink-500"><Lock className="h-6 w-6" /></span>
                <h2 className="mt-3 font-extrabold text-navy-900">{c.title}</h2>
                <p className="mt-1 text-sm text-ink-500">با تکمیل دوره و قبولی در ارزیابی، گواهی صادر می‌شود.</p>
                <ProgressBar value={c.progress ?? 0} showLabel className="mt-4" />
              </>
            ) : (
              <>
                <div className="pattern-strip absolute inset-x-0 top-0" aria-hidden />
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ochre-600 text-white"><Award className="h-6 w-6" /></span>
                <h2 className="mt-3 font-extrabold text-navy-900">{c.title}</h2>
                <p className="mt-1 text-[13px] text-ink-500">صادر شده در {c.date} • کد {c.code}</p>
                <button type="button" className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-navy-800/20 px-5 text-sm font-bold text-navy-800 transition-colors hover:border-navy-800 hover:bg-navy-50">
                  <Download className="h-4 w-4" />
                  دانلود گواهی
                </button>
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
