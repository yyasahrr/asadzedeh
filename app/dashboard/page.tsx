import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, Flame, PlayCircle } from "lucide-react";
import { dashboardStudent } from "@/lib/data";
import { toFa } from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "پنل هنرجو" };

export default function DashboardPage() {
  const s = dashboardStudent;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy-900">سلام {s.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-ink-600">امروز {toFa(s.streakDays)} روز متوالی است که تمرین می‌کنید؛ ادامه بدهید!</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ochre-100/70 px-4 py-2 text-sm font-bold text-ochre-700">
          <Flame className="h-4 w-4" />
          {toFa(s.streakDays)} روز پیاپی
        </span>
      </div>

      {/* Continue learning */}
      <section className="grid gap-4 rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-[200px_1fr] sm:p-6" aria-label="ادامه یادگیری">
        <div className="relative min-h-36 overflow-hidden rounded-xl">
          <Image src={s.continueLearning.image} alt={s.continueLearning.title} fill sizes="220px" className="object-cover" />
        </div>
        <div className="flex flex-col">
          <p className="text-xs font-bold text-teal-600">ادامه یادگیری</p>
          <h2 className="mt-1 leading-8 font-extrabold text-navy-900">{s.continueLearning.title}</h2>
          <p className="mt-1 text-sm text-ink-600">{s.continueLearning.lesson}</p>
          <ProgressBar value={s.continueLearning.progress} showLabel className="mt-3 max-w-md" />
          <div className="mt-4">
            <Link href="/dashboard/courses" className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700">
              <PlayCircle className="h-4 w-4" />
              ادامه درس
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Next class */}
        <section className="rounded-2xl bg-navy-900 p-6 text-white shadow-card" aria-label="کلاس بعدی">
          <p className="flex items-center gap-2 text-sm font-bold text-ochre-200">
            <CalendarDays className="h-4 w-4" />
            کلاس بعدی شما
          </p>
          <h2 className="mt-2 font-extrabold">{s.nextClass.title}</h2>
          <p className="mt-1 text-sm text-white/70">{s.nextClass.session}</p>
          <p className="mt-3 flex items-center gap-2 text-sm">
            <Clock3 className="h-4 w-4 text-ochre-200" />
            {s.nextClass.date} • {s.nextClass.time}
          </p>
          <Link href="/dashboard/classes" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-ochre-200 hover:text-white">
            جزئیات کلاس‌های من
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </section>

        {/* Assignments */}
        <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5" aria-label="تمرین‌ها">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-extrabold text-navy-900">تمرین‌های باز</h2>
            <Link href="/dashboard/assignments" className="text-[13px] font-bold text-teal-600 hover:text-teal-700">
              همه تمرین‌ها ←
            </Link>
          </div>
          <ul className="space-y-3">
            {s.assignments.map((a) => (
              <li key={a.title} className="flex items-center justify-between gap-3 rounded-xl bg-sand-50 px-4 py-3 ring-1 ring-ink-900/5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-800">{a.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">مهلت: {a.due}</p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
