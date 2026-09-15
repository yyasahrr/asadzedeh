import type { Metadata } from "next";
import { createInstructor } from "../../actions";
import { Denied } from "@/components/admin/Denied";
import { InstructorForm } from "@/components/admin/InstructorForm";
import { can, getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "مدرس جدید" };

export default async function NewInstructorPage() {
  const user = await getSessionUser();
  if (!user || !can(user, "instructors")) return <Denied />;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">افزودن مدرس جدید</h1>
      <InstructorForm action={createInstructor} submitLabel="ثبت مدرس" />
    </div>
  );
}
