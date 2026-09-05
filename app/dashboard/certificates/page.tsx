import type { Metadata } from "next";
import Link from "next/link";
import { Award, FileBadge, Lock } from "lucide-react";
import { getCertificatesByStudent } from "@/lib/store";
import { dashboardStudent } from "@/lib/data";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const metadata: Metadata = { title: "گواهی‌ها" };

export default function CertificatesPage() {
  const mine = getCertificatesByStudent(dashboardStudent.name);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">گواهی‌ها</h1>
      <div className="grid gap-5 md:grid-cols-2">
        {mine.map((c) => (
          <article key={c.code} className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
            <div className="pattern-strip absolute inset-x-0 top-0" aria-hidden />
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ochre-600 text-white">
              <Award className="h-6 w-6" />
            </span>
            <h2 className="mt-3 font-extrabold text-navy-900">{c.course}</h2>
            <p className="mt-1 text-[13px] text-ink-500">
              صادر شده در {c.date} • کد <span dir="ltr">{c.code}</span>
            </p>
            <Link
              href={`/dashboard/certificates/${encodeURIComponent(c.code)}`}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700"
            >
              <FileBadge className="h-4 w-4" />
              مشاهده و دریافت PDF
            </Link>
          </article>
        ))}

        {/* In progress */}
        <article className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand-200 text-ink-500">
            <Lock className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-extrabold text-navy-900">فرش‌بافی مقدماتی</h2>
          <p className="mt-1 text-sm text-ink-500">با تکمیل دوره و قبولی در ارزیابی، گواهی صادر می‌شود.</p>
          <ProgressBar value={34} showLabel className="mt-4" />
        </article>
      </div>
    </div>
  );
}
