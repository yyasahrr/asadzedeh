import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, ExternalLink } from "lucide-react";
import { instructorUpdateProfile } from "../actions";
import { UploadField } from "@/components/admin/UploadField";
import { FieldLabel, Input, Textarea } from "@/components/ui/Input";
import { getSessionUser } from "@/lib/auth";
import { instructorImages } from "@/lib/seed";
import { getInstructorByUser } from "@/lib/store";

export const metadata: Metadata = { title: "پروفایل مدرس" };
export const dynamic = "force-dynamic";

export default async function InstructorProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = (await getSessionUser())!;
  const inst = getInstructorByUser(user.id)!;
  const { saved } = await searchParams;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">پروفایل عمومی</h1>
        <Link href={`/instructors#${inst.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-bold text-teal-700 hover:underline">
          مشاهده در سایت <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      {saved && (
        <div className="flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
          <CircleCheck className="h-4 w-4" /> پروفایل به‌روزرسانی شد.
        </div>
      )}
      <form action={instructorUpdateProfile} className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
        <div className="sm:col-span-2 rounded-xl bg-sand-50 px-4 py-3 text-sm text-ink-600">
          نام نمایشی: <b className="text-ink-900">{inst.name}</b> — برای تغییر نام یا شماره موبایل با مدیریت هماهنگ کنید.
        </div>
        <div>
          <FieldLabel htmlFor="p-spec">تخصص</FieldLabel>
          <Input id="p-spec" name="specialty" defaultValue={inst.specialty} />
        </div>
        <div>
          <FieldLabel htmlFor="p-exp">سابقه</FieldLabel>
          <Input id="p-exp" name="experience" defaultValue={inst.experience} />
        </div>
        <div className="sm:col-span-2">
          <UploadField name="image" label="تصویر پروفایل" gallery={instructorImages} initial={inst.image} />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="p-bio">معرفی کوتاه</FieldLabel>
          <Textarea id="p-bio" name="bio" defaultValue={inst.bio} className="min-h-20" />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="p-about">زندگی‌نامه (هر پاراگراف در یک خط)</FieldLabel>
          <Textarea id="p-about" name="about" defaultValue={inst.about?.join("\n")} />
        </div>
        <div>
          <FieldLabel htmlFor="p-email">ایمیل</FieldLabel>
          <Input id="p-email" name="email" type="email" defaultValue={inst.email} dir="ltr" className="text-left" />
        </div>
        <div>
          <FieldLabel htmlFor="p-ig">اینستاگرام</FieldLabel>
          <Input id="p-ig" name="instagram" defaultValue={inst.instagram} dir="ltr" className="text-left" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 text-sm font-bold text-white hover:bg-navy-700">ذخیره پروفایل</button>
        </div>
      </form>
    </div>
  );
}
