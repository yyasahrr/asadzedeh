import { CheckCircle2 } from "lucide-react";
import { carpetRoadmap } from "@/lib/data";
import { SectionHeading } from "../ui/SectionHeading";
import { Button } from "../ui/Button";
import { toFa } from "@/lib/format";

export function Roadmap() {
  return (
    <section className="section-pad shell" aria-labelledby="roadmap">
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
        <div className="lg:sticky lg:top-28">
          <SectionHeading
            align="start"
            eyebrow="نقشه راه"
            title="مسیر فرش‌بافی؛ از شناخت ابزار تا فروش اثر"
            description="یک مسیر پنج‌مرحله‌ای که دقیقاً می‌دانید هر ماه کجا هستید و قدم بعدی چیست. با پایان هر مرحله، وارد مرحله بعد می‌شوید."
          />
          <ul className="space-y-3">
            {["برنامه مشخص برای هر هفته", "ارزیابی پایان هر مرحله توسط استاد", "گواهی جداگانه برای هر سطح"].map((t) => (
              <li key={t} className="flex items-center gap-2 text-[15px] font-semibold text-ink-700">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/paths">مشاهده همه مسیرها</Button>
            <Button href="/courses/carpet-weaving-foundations" variant="outline">
              شروع مرحله اول
            </Button>
          </div>
        </div>

        <ol className="relative space-y-4 border-r-2 border-dashed border-ochre-600/40 pr-0">
          {carpetRoadmap.map((s, i) => (
            <li key={s.step} className="relative flex gap-4 pr-6">
              <span
                className="absolute top-5 right-0 flex h-9 w-9 translate-x-1/2 items-center justify-center rounded-full bg-navy-800 text-sm font-black text-white ring-4 ring-sand-100"
                aria-hidden
              >
                {toFa(s.step)}
              </span>
              <div className="flex-1 rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-extrabold text-navy-900">
                    مرحله {toFa(s.step)} — {s.title}
                  </h3>
                  <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ink-600">
                    {s.meta}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-ink-600">{s.description}</p>
                {i === 0 && (
                  <p className="mt-3 text-[13px] font-bold text-teal-600">← شما از اینجا شروع می‌کنید</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
