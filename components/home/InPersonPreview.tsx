import { getClasses } from "@/lib/store";
import { InPersonCourseCard } from "../cards/InPersonCourseCard";
import { SectionHeading } from "../ui/SectionHeading";
import { Button } from "../ui/Button";

export function InPersonPreview() {
  return (
    <section className="bg-navy-900 bg-lattice-light" aria-labelledby="inperson-preview">
      <div className="section-pad shell">
        <SectionHeading
          dark
          eyebrow="کارگاه حضوری ارومیه"
          title="کلاس‌های حضوری؛ بافت شانه‌به‌شانه استاد"
          description="ظرفیت محدود، دار اختصاصی و تجربه واقعی کارگاه؛ برای کسانی که می‌خواهند با دست یاد بگیرند."
          link={{ href: "/classes", label: "مشاهده همه کلاس‌ها" }}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {getClasses().slice(0, 3).map((c) => (
            <InPersonCourseCard key={c.slug} cls={c} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button href="/classes" variant="highlight" size="lg">
            ثبت‌نام در کلاس حضوری
          </Button>
        </div>
      </div>
    </section>
  );
}
