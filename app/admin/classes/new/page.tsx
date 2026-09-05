import type { Metadata } from "next";
import { createClass } from "../../actions";
import { ClassForm } from "@/components/admin/ClassForm";

export const metadata: Metadata = { title: "کلاس جدید" };

export default function NewClassPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">کلاس جدید</h1>
      <ClassForm action={createClass} submitLabel="انتشار کلاس" />
    </div>
  );
}
