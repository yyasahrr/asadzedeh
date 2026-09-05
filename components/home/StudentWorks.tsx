import { studentWorks } from "@/lib/data";
import { StudentWorkCard } from "../cards/StudentWorkCard";
import { SectionHeading } from "../ui/SectionHeading";

export function StudentWorks() {
  return (
    <section className="bg-sand-50" aria-labelledby="student-works">
      <div className="section-pad shell">
        <SectionHeading
          eyebrow="افتخار ما"
          title="آثار هنرجویان"
          description="این‌ها را کسانی بافته‌اند که چند ماه پیش از صفر شروع کردند؛ اثر بعدی می‌تواند مال شما باشد."
        />
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2">
          {studentWorks.map((w) => (
            <StudentWorkCard key={w.id} work={w} />
          ))}
          <a
            href="/courses"
            className="flex w-64 shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-navy-800/25 bg-card/50 p-6 text-center transition-colors hover:border-madder-700 hover:bg-card sm:w-72"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-madder-700 text-2xl font-black text-white">
              +
            </span>
            <span className="font-extrabold text-navy-900">اثر شما این‌جا قرار می‌گیرد</span>
            <span className="text-sm leading-7 text-ink-600">همین امروز اولین دوره را شروع کنید</span>
          </a>
        </div>
      </div>
    </section>
  );
}
