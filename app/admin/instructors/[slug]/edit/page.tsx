import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateInstructor } from "../../../actions";
import { Denied } from "@/components/admin/Denied";
import { InstructorForm } from "@/components/admin/InstructorForm";
import { can, getSessionUser } from "@/lib/auth";
import { getInstructor } from "@/lib/store";

export const metadata: Metadata = { title: "ویرایش مدرس" };

export default async function EditInstructorPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user || !can(user, "instructors")) return <Denied />;
  const { slug } = await params;
  const inst = getInstructor(slug);
  if (!inst) notFound();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">ویرایش: {inst.name}</h1>
      <InstructorForm action={updateInstructor} initial={inst} submitLabel="ذخیره تغییرات" />
    </div>
  );
}
