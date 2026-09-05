import type { Metadata } from "next";
import { createCourse } from "../../actions";
import { CourseForm } from "@/components/admin/CourseForm";

export const metadata: Metadata = { title: "دوره جدید" };

export default function NewCoursePage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">دوره جدید</h1>
      <CourseForm action={createCourse} submitLabel="انتشار دوره" />
    </div>
  );
}
