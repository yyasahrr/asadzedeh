import type { Metadata } from "next";
import { FieldLabel, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { dashboardStudent } from "@/lib/data";

export const metadata: Metadata = { title: "پروفایل" };

export default function ProfilePage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">پروفایل</h1>
      <form className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="p-name">نام و نام خانوادگی</FieldLabel>
          <Input id="p-name" defaultValue={dashboardStudent.name} />
        </div>
        <div>
          <FieldLabel htmlFor="p-phone">شماره موبایل</FieldLabel>
          <Input id="p-phone" defaultValue="09123456789" dir="ltr" className="text-left" />
        </div>
        <div>
          <FieldLabel htmlFor="p-email">ایمیل</FieldLabel>
          <Input id="p-email" type="email" defaultValue="sara@example.com" dir="ltr" className="text-left" />
        </div>
        <div>
          <FieldLabel htmlFor="p-city">شهر</FieldLabel>
          <Input id="p-city" defaultValue="تهران" />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="p-bio">درباره من (نمایش در گواهی‌ها)</FieldLabel>
          <Textarea id="p-bio" defaultValue="علاقه‌مند به بافت‌های ذهنی و رنگ‌های طبیعی؛ هنرجوی گبه و رنگرزی." />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">ذخیره تغییرات</Button>
        </div>
      </form>
    </div>
  );
}
