import { learningPaths } from "@/lib/data";
import { LearningPathCard } from "../cards/LearningPathCard";
import { SectionHeading } from "../ui/SectionHeading";

export function PathStart() {
  return (
    <section className="section-pad shell" aria-labelledby="start-paths">
      <SectionHeading
        eyebrow="مسیر یادگیری"
        title="از کجا شروع کنم؟"
        description="پنج مسیر مشخص برای پنج سلیقه مختلف؛ یکی را انتخاب کنید و قدم‌به‌قدم تا حرفه‌ای شدن پیش بروید."
        link={{ href: "/paths", label: "مشاهده همه مسیرها" }}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
        {learningPaths.map((p) => (
          <LearningPathCard key={p.slug} path={p} />
        ))}
      </div>
    </section>
  );
}
