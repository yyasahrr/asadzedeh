import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateCourse } from "../../../actions";
import { CourseForm } from "@/components/admin/CourseForm";
import { getCourse } from "@/lib/store";

export const metadata: Metadata = { title: "ویرایش دوره" };

export default async function EditCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">ویرایش: {course.shortTitle}</h1>
      <CourseForm action={updateCourse} initial={course} submitLabel="ذخیره تغییرات" />
    </div>
  );
}
