import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { CourseExplorer } from "@/components/courses/CourseExplorer";
import { getCourses } from "@/lib/store";

export const metadata: Metadata = {
  title: "دوره‌های آنلاین",
  description: "دوره‌های آنلاین فرش‌بافی، گلیم‌بافی، گبه‌بافی، رنگرزی، مرمت و طراحی نقشه با پشتیبانی استاد.",
};

export default function CoursesPage() {
  return (
    <>
      <PageHero
        title="دوره‌های آنلاین"
        description="با ویدیوی قدم‌به‌قدم، رفع‌اشکال تصویری و پشتیبانی مستقیم استاد؛ هر کجای ایران که هستید، سر کلاس حاضرید."
        crumbs={[{ href: "/", label: "خانه" }, { label: "دوره‌های آنلاین" }]}
      />
      <div className="shell py-10 lg:py-12">
        <CourseExplorer courses={getCourses()} />
      </div>
    </>
  );
}
