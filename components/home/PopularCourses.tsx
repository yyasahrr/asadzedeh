import { getCourses } from "@/lib/store";
import { CourseCard } from "../cards/CourseCard";
import { SectionHeading } from "../ui/SectionHeading";
import { Button } from "../ui/Button";

export function PopularCourses() {
  const popular = getCourses().slice(0, 4);
  return (
    <section className="bg-sand-50" aria-labelledby="popular-courses">
      <div className="section-pad shell">
        <SectionHeading
          eyebrow="آموزش آنلاین"
          title="دوره‌های آنلاین محبوب"
          description="یادگیری با ویدیوی قدم‌به‌قدم، رفع‌اشکال تصویری و پشتیبانی استاد؛ هر کجای ایران که هستید."
          link={{ href: "/courses", label: "مشاهده همه دوره‌ها" }}
        />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {popular.map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button href="/courses" variant="outline" size="lg">
            مشاهده همه دوره‌های آنلاین
          </Button>
        </div>
      </div>
    </section>
  );
}
