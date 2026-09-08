import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, FileText, Mail, MessageSquareText } from "lucide-react";
import { getSettings } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import { listSmsDrivers } from "@/lib/sms";
import { appUrl } from "@/lib/env";
import { resetDemoData, saveChannelSettings, saveEmailSettings, saveLegalSettings, saveSmsSettings } from "../actions";
import { LegalSettingsManager } from "@/components/admin/LegalSettingsManager";

export const metadata: Metadata = { title: "تنظیمات" };

const savedMessages: Record<string, string> = {
  sms: "تنظیمات پیامک ذخیره شد.",
  email: "تنظیمات ایمیل ذخیره شد.",
  legal: "تنظیمات صفحات حقوقی ذخیره شد.",
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
  // Shown to the operator so the exact feed URL can be pasted into the panel.
  const siteUrl = appUrl();

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
              {listSmsDrivers().map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
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
          <div>
            <FieldLabel htmlFor="sms-template">شناسه قالب کد (برای پیامک‌دهی)</FieldLabel>
            <Input id="sms-template" name="templateId" defaultValue={settings.sms.templateId} dir="ltr" className="text-left" placeholder="123456" />
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-7 text-ink-500">
          پیامک‌دهی (sms.ir) کد ورود را از طریق قالب ثبت‌شده ارسال می‌کند، پس شناسه قالب لازم است؛
          کاوه‌نگار و قاصدک متن آزاد می‌فرستند. ورود با کد پیامکی در صفحه ورود فعال است.
        </p>
        <button type="submit" className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
          ذخیره تنظیمات پیامک
        </button>
      </form>

      <form action={saveChannelSettings} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="font-extrabold text-navy-900">کانال‌های فروش و مقایسه قیمت</h2>
        <p className="mt-2 text-[13px] leading-7 text-ink-500">
          ترب و ایمالز فید محصولات را از نشانی زیر می‌خوانند و دوره‌ای به‌روز می‌کنند. نشانی فید را در
          پنل فروشنده همان سامانه ثبت کنید:
        </p>
        <ul className="mt-2 space-y-1 text-[13px] text-ink-700" dir="ltr">
          <li className="font-mono">{`${siteUrl}/api/feed/torob`}</li>
          <li className="font-mono">{`${siteUrl}/api/feed/emalls`}</li>
        </ul>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2.5 text-sm font-bold">
            <input type="checkbox" name="torobEnabled" defaultChecked={settings.channels.torob.enabled} className="h-4 w-4 accent-teal-600" />
            فعال‌سازی فید ترب
          </label>
          <label className="flex items-center gap-2.5 text-sm font-bold">
            <input type="checkbox" name="emallsEnabled" defaultChecked={settings.channels.emalls.enabled} className="h-4 w-4 accent-teal-600" />
            فعال‌سازی فید ایمالز
          </label>
          <div>
            <FieldLabel htmlFor="ch-brand">نام برند در فید</FieldLabel>
            <Input id="ch-brand" name="brand" defaultValue={settings.channels.brand} />
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-sand-100 p-4">
          <p className="text-sm font-extrabold text-navy-900">باسلام (مارکت‌پلیس)</p>
          <p className="mt-1 text-[13px] leading-7 text-ink-600">
            باسام برخلاف ترب فید نمی‌خواند، بلکه کالا باید از طریق API فروشنده ارسال شود. تا وارد شدن
            اعتبارنامه و دریافت قرارداد پایانه‌ها، این کانال
            <span className="font-bold text-madder-700"> BLOCKED BY EXTERNAL CONFIGURATION </span>
            است و انتشار واقعی انجام نمی‌شود.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2.5 text-sm font-bold">
              <input type="checkbox" name="basalamEnabled" defaultChecked={settings.channels.basalam.enabled} className="h-4 w-4 accent-teal-600" />
              فعال‌سازی باسلام
            </label>
            <div />
            <div>
              <FieldLabel htmlFor="ch-basalam-id">شناسه فروشنده</FieldLabel>
              <Input id="ch-basalam-id" name="basalamMerchantId" defaultValue={settings.channels.basalam.merchantId} dir="ltr" className="text-left" autoComplete="off" />
            </div>
            <div>
              <FieldLabel htmlFor="ch-basalam-key">کلید API</FieldLabel>
              <Input id="ch-basalam-key" name="basalamApiKey" type="password" defaultValue={settings.channels.basalam.apiKey} dir="ltr" className="text-left" autoComplete="off" />
            </div>
          </div>
        </div>

        <button type="submit" className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
          ذخیره تنظیمات کانال‌ها
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

      <form action={saveLegalSettings} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
          <FileText className="h-5 w-5 text-moss-600" />
          صفحات حقوقی
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          محتوای صفحات قوانین و مقررات، حریم خصوصی و قوانین استفاده را اینجا ویرایش کنید.
        </p>
        <div className="mt-4">
          <LegalSettingsManager initialPages={settings.legal?.pages ?? []} />
        </div>
        <button type="submit" className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
          ذخیره تنظیمات صفحات حقوقی
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
