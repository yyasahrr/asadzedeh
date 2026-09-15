import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, KeyRound, ShieldCheck, XCircle } from "lucide-react";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getSessionUser } from "@/lib/auth";
import { changePassword, updateProfile } from "../actions";
import { ProvinceCitySelect } from "@/components/dashboard/ProvinceCitySelect";
import { genderOptions } from "@/lib/iran-locations";

export const metadata: Metadata = { title: "پروفایل" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  name: "نام باید حداقل ۲ حرف باشد.",
  email: "ایمیل واردشده معتبر نیست.",
  current: "رمز عبور فعلی درست نیست.",
  weak: "رمز عبور جدید باید حداقل ۶ کاراکتر باشد.",
  confirm: "تکرار رمز عبور با رمز جدید یکسان نیست.",
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await getSessionUser();
  const { saved, error } = await searchParams;

  if (!user) {
    return (
      <div className="rounded-2xl bg-card p-10 text-center shadow-card">
        <p className="font-extrabold text-navy-900">برای ویرایش پروفایل وارد حساب شوید.</p>
        <Link href="/auth?next=/dashboard/profile" className="mt-3 inline-block text-sm font-bold text-teal-600 hover:underline">ورود / ثبت‌نام ←</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">پروفایل</h1>

      {saved && (
        <p className="flex items-center gap-2 rounded-2xl bg-teal-50 px-5 py-3.5 text-sm font-bold text-teal-800 ring-1 ring-teal-600/25 ring-inset">
          <CheckCircle2 className="h-5 w-5" />
          {saved === "pass" ? "رمز عبور با موفقیت تغییر کرد." : "اطلاعات پروفایل ذخیره شد."}
        </p>
      )}
      {error && errors[error] && (
        <p className="flex items-center gap-2 rounded-2xl bg-madder-50 px-5 py-3.5 text-sm font-bold text-madder-700 ring-1 ring-madder-700/25 ring-inset">
          <XCircle className="h-5 w-5" />
          {errors[error]}
        </p>
      )}

      <form action={updateProfile} className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="p-name">نام و نام خانوادگی</FieldLabel>
          <Input id="p-name" name="name" required minLength={2} defaultValue={user.name} />
        </div>
        <div>
          <FieldLabel htmlFor="p-phone">شماره موبایل (شناسه ورود)</FieldLabel>
          <Input id="p-phone" defaultValue={user.phone} dir="ltr" className="text-left" readOnly disabled />
          <p className="mt-1 text-[11px] text-ink-500">این شماره روی ویدیوهای دوره به‌عنوان واترمارک نمایش داده می‌شود و قابل تغییر نیست.</p>
        </div>
        <div>
          <FieldLabel htmlFor="p-email">ایمیل</FieldLabel>
          <Input id="p-email" name="email" type="email" defaultValue={user.email ?? ""} dir="ltr" className="text-left" placeholder="you@example.com" />
        </div>
        <div>
          <FieldLabel htmlFor="p-age">سن</FieldLabel>
          <Input id="p-age" name="age" type="number" min={10} max={100} defaultValue={user.age ?? ""} placeholder="مثلاً ۲۸" />
        </div>
        <div>
          <FieldLabel htmlFor="p-gender">جنسیت</FieldLabel>
          <Select id="p-gender" name="gender" defaultValue={user.gender ?? ""}>
            <option value="">انتخاب کنید</option>
            {genderOptions.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <ProvinceCitySelect initialProvince={user.province} initialCity={user.city} />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="p-bio">درباره من (نمایش در گواهی‌ها)</FieldLabel>
          <Textarea id="p-bio" name="bio" defaultValue={user.bio ?? ""} placeholder="مثلاً: علاقه‌مند به بافت‌های ذهنی و رنگ‌های طبیعی" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">ذخیره تغییرات</Button>
        </div>
      </form>

      <div className="grid gap-5 lg:grid-cols-2">
        <form action={changePassword} className="space-y-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
            <KeyRound className="h-5 w-5 text-teal-600" />
            تغییر رمز عبور
          </h2>
          <div>
            <FieldLabel htmlFor="pw-current">رمز فعلی</FieldLabel>
            <Input id="pw-current" name="current" type="password" required dir="ltr" className="text-left" autoComplete="current-password" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pw-next">رمز جدید</FieldLabel>
              <Input id="pw-next" name="next" type="password" required minLength={6} dir="ltr" className="text-left" autoComplete="new-password" />
            </div>
            <div>
              <FieldLabel htmlFor="pw-confirm">تکرار رمز جدید</FieldLabel>
              <Input id="pw-confirm" name="confirm" type="password" required minLength={6} dir="ltr" className="text-left" autoComplete="new-password" />
            </div>
          </div>
          <Button type="submit" variant="outline">تغییر رمز</Button>
        </form>

        <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            ورود دومرحله‌ای
          </h2>
          <p className="mt-2 text-sm leading-7 text-ink-600">
            {user.totpEnabled
              ? "ورود دومرحله‌ای برای حساب شما فعال است. برای مدیریت کدهای بازیابی یا غیرفعال‌سازی به صفحه امنیت بروید."
              : "با فعال‌کردن ورود دومرحله‌ای (Google Authenticator)، حتی با لو رفتن رمز، کسی نمی‌تواند وارد حساب شما شود."}
          </p>
          <Link href="/account/security" className="mt-4 inline-flex h-10 items-center rounded-xl bg-sand-100 px-5 text-sm font-bold text-navy-900 hover:bg-sand-200">
            {user.totpEnabled ? "مدیریت امنیت حساب" : "فعال‌سازی ورود دومرحله‌ای"}
          </Link>
        </section>
      </div>
    </div>
  );
}
