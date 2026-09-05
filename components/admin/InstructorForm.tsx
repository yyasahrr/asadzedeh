import Link from "next/link";
import { KeyRound, Percent, User } from "lucide-react";
import type { Instructor } from "@/lib/types";
import { instructorImages } from "@/lib/seed";
import { getUserById } from "@/lib/store";
import { FieldLabel, Input, Textarea } from "../ui/Input";
import { UploadField } from "./UploadField";

export function InstructorForm({ action, initial, submitLabel }: { action: (fd: FormData) => void; initial?: Instructor | null; submitLabel: string }) {
  const i = initial ?? null;
  const linked = i?.userId ? getUserById(i.userId) : undefined;
  return (
    <form action={action} className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
      {i && <input type="hidden" name="slug" value={i.slug} />}

      <div className="sm:col-span-2">
        <FieldLabel htmlFor="i-name">نام و نام خانوادگی *</FieldLabel>
        <Input id="i-name" name="name" required defaultValue={i?.name} placeholder="مثلاً: استاد مریم کریمی" />
      </div>
      {!i && (
        <div>
          <FieldLabel htmlFor="i-slug">نامک انگلیسی (اختیاری)</FieldLabel>
          <Input id="i-slug" name="slug" placeholder="maryam-karimi" dir="ltr" className="text-left" />
        </div>
      )}
      <div>
        <FieldLabel htmlFor="i-spec">تخصص</FieldLabel>
        <Input id="i-spec" name="specialty" defaultValue={i?.specialty} placeholder="مثلاً: گلیم‌بافی و نقش‌پردازی" />
      </div>
      <div>
        <FieldLabel htmlFor="i-exp">سابقه</FieldLabel>
        <Input id="i-exp" name="experience" defaultValue={i?.experience} placeholder="مثلاً: ۱۵ سال" />
      </div>
      <div>
        <FieldLabel htmlFor="i-students">تعداد هنرجویان (نمایشی)</FieldLabel>
        <Input id="i-students" name="students" inputMode="numeric" defaultValue={i?.students ?? 0} dir="ltr" className="text-left" />
      </div>
      <div className="sm:col-span-2">
        <UploadField name="image" label="تصویر مدرس" gallery={instructorImages} initial={i?.image} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="i-bio">معرفی کوتاه</FieldLabel>
        <Textarea id="i-bio" name="bio" defaultValue={i?.bio} className="min-h-20" placeholder="یک تا دو جمله برای کارت مدرس…" />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="i-about">زندگی‌نامه کامل (هر پاراگراف در یک خط)</FieldLabel>
        <Textarea id="i-about" name="about" defaultValue={i?.about?.join("\n")} />
      </div>
      <div>
        <FieldLabel htmlFor="i-email">ایمیل</FieldLabel>
        <Input id="i-email" name="email" type="email" defaultValue={i?.email} dir="ltr" className="text-left" />
      </div>
      <div>
        <FieldLabel htmlFor="i-ig">اینستاگرام (بدون @)</FieldLabel>
        <Input id="i-ig" name="instagram" defaultValue={i?.instagram} dir="ltr" className="text-left" />
      </div>

      {/* Login account */}
      <fieldset className="rounded-2xl border border-dashed border-ink-900/15 p-4 sm:col-span-2">
        <legend className="flex items-center gap-1.5 px-2 text-sm font-black text-navy-900"><KeyRound className="h-4 w-4 text-teal-700" /> حساب ورود به پنل مدرس</legend>
        {linked ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900">
            <User className="h-4 w-4" /> متصل به حساب <b>{linked.name}</b> <span dir="ltr">({linked.phone})</span> — نقش: {linked.role === "instructor" ? "مدرس" : linked.role}
            {linked.totp?.enabled && <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-teal-700">۲FA فعال</span>}
          </div>
        ) : (
          <p className="mb-3 text-xs leading-6 text-ink-500">
            با وارد کردن شماره موبایل و رمز (حداقل ۶ کاراکتر) یک حساب با نقش «مدرس» ساخته می‌شود. اگر شماره قبلاً ثبت‌نام کرده باشد، همان حساب ارتقا می‌یابد.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="i-phone">شماره موبایل</FieldLabel>
            <Input id="i-phone" name="phone" inputMode="tel" defaultValue={i?.phone ?? linked?.phone} placeholder="0912…" dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="i-pass">{linked ? "رمز جدید (اختیاری)" : "رمز عبور"}</FieldLabel>
            <Input id="i-pass" name="password" type="password" autoComplete="new-password" placeholder={linked ? "برای تغییر رمز پر کنید" : "حداقل ۶ کاراکتر"} dir="ltr" className="text-left" />
          </div>
        </div>
      </fieldset>

      <div>
        <FieldLabel htmlFor="i-comm">سهم مدرس از فروش (درصد)</FieldLabel>
        <div className="relative">
          <Input id="i-comm" name="commissionPercent" inputMode="numeric" defaultValue={i?.commissionPercent ?? 60} dir="ltr" className="text-left" />
          <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        </div>
      </div>
      <div className="flex flex-col justify-end gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
          <input type="checkbox" name="featured" value="1" defaultChecked={i?.featured} className="h-4 w-4 accent-teal-700" /> نمایش ویژه در صفحه اصلی
        </label>
        {i && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
            <input type="checkbox" name="active" value="1" defaultChecked={i.active !== false} className="h-4 w-4 accent-teal-700" /> فعال (قابل انتخاب برای دوره‌ها)
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 text-[15px] font-bold text-white transition-colors hover:bg-navy-700">
          {submitLabel}
        </button>
        <Link href="/admin/instructors" className="inline-flex h-11 items-center rounded-xl bg-sand-200 px-6 text-sm font-bold text-ink-700 transition-colors hover:bg-sand-300">
          انصراف
        </Link>
      </div>
    </form>
  );
}
