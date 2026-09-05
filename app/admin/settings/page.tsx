import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Mail, MessageSquareText } from "lucide-react";
import { getSettings } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import { resetDemoData, saveEmailSettings, saveSmsSettings } from "../actions";

export const metadata: Metadata = { title: "تنظیمات" };

const savedMessages: Record<string, string> = {
  sms: "تنظیمات پیامک ذخیره شد.",
  email: "تنظیمات ایمیل ذخیره شد.",
  reset: "داده نمایشی ریست شد و به حالت اولیه برگشت.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await getSessionUser();
  if (!can(user, "settings")) return <Denied />;
  const { saved } = await searchParams;
  const settings = getSettings();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">تنظیمات</h1>
      {saved && savedMessages[saved] && (
        <p className="flex items-center gap-2 rounded-2xl bg-teal-50 px-5 py-3.5 text-sm font-bold text-teal-800 ring-1 ring-teal-600/25 ring-inset">
          <CheckCircle2 className="h-5 w-5" />
          {savedMessages[saved]}
        </p>
      )}

      <form action={saveSmsSettings} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
          <MessageSquareText className="h-5 w-5 text-teal-600" />
          اتصال به سامانه پیامکی
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel htmlFor="sms-provider">سامانه</FieldLabel>
            <Select id="sms-provider" name="provider" defaultValue={settings.sms.provider}>
              <option value="demo">نمایشی (بدون ارسال واقعی)</option>
              <option value="kavenegar">کاوه‌نگار</option>
              <option value="ghasedak">قاصدک</option>
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="sms-key">کلید API</FieldLabel>
            <Input id="sms-key" name="apiKey" defaultValue={settings.sms.apiKey} dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="sms-sender">شماره فرستنده (اختیاری)</FieldLabel>
            <Input id="sms-sender" name="sender" defaultValue={settings.sms.sender} dir="ltr" className="text-left" />
          </div>
        </div>
        <button type="submit" className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
          ذخیره تنظیمات پیامک
        </button>
      </form>

      <form action={saveEmailSettings} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
          <Mail className="h-5 w-5 text-ochre-600" />
          اتصال ایمیل (SMTP)
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <FieldLabel htmlFor="em-host">هاست SMTP</FieldLabel>
            <Input id="em-host" name="host" defaultValue={settings.email.host} dir="ltr" className="text-left" placeholder="mail.example.com" />
          </div>
          <div>
            <FieldLabel htmlFor="em-port">پورت</FieldLabel>
            <Input id="em-port" name="port" inputMode="numeric" defaultValue={settings.email.port} dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="em-user">نام کاربری</FieldLabel>
            <Input id="em-user" name="user" defaultValue={settings.email.user} dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="em-pass">رمز عبور</FieldLabel>
            <Input id="em-pass" name="pass" type="password" defaultValue={settings.email.pass} dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="em-from">ایمیل فرستنده</FieldLabel>
            <Input id="em-from" name="from" defaultValue={settings.email.from} dir="ltr" className="text-left" />
          </div>
        </div>
        <button type="submit" className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
          ذخیره تنظیمات ایمیل
        </button>
      </form>

      {user?.role === "admin" && (
        <section className="rounded-2xl bg-madder-50 p-6 ring-1 ring-madder-700/25 ring-inset">
          <h2 className="flex items-center gap-2 font-extrabold text-madder-700">
            <AlertTriangle className="h-5 w-5" />
            ناحیه خطر
          </h2>
          <p className="mt-2 text-sm leading-7 text-ink-700">
            ریست داده نمایشی: همه تغییرات (دوره‌ها، سفارش‌ها، کاربران جدید و…) پاک و دیتابیس به حالت اولیه برمی‌گردد. تصاویر آپلودشده پاک نمی‌شوند.
          </p>
          <form action={resetDemoData} className="mt-4">
            <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-madder-700 px-8 font-bold text-white transition-colors hover:bg-madder-600">
              ریست داده نمایشی
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
