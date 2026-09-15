import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateClass } from "../../../actions";
import { ClassForm } from "@/components/admin/ClassForm";
import { getClass } from "@/lib/store";

export const metadata: Metadata = { title: "ویرایش کلاس" };

export default async function EditClassPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cls = getClass(slug);
  if (!cls) notFound();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">ویرایش: {cls.title}</h1>
      <ClassForm action={updateClass} initial={cls} submitLabel="ذخیره تغییرات" />
    </div>
  );
}
