import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, FileText, Headphones, KeyRound, Mail, MessageSquareText } from "lucide-react";
import { getSettings } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import {
  resetDemoData,
  saveEmailSettings,
  saveLegalSettings,
  saveOtpSettings,
  saveSmsSettings,
  saveSupportWidgetSettings,
} from "../actions";
import { LegalSettingsManager } from "@/components/admin/LegalSettingsManager";
import { SupportChannelsManager } from "@/components/admin/SupportChannelsManager";
import { SMS_PROVIDER_LABELS } from "@/lib/notify";
import { defaultSupportWidget } from "@/lib/seed";

export const metadata: Metadata = { title: "تنظیمات" };

const savedMessages: Record<string, string> = {
  sms: "تنظیمات پیامک ذخیره شد.",
  email: "تنظیمات ایمیل ذخیره شد.",
  otp: "تنظیمات ورود با کد یک‌بارمصرف ذخیره شد.",
  support: "دکمه پشتیبانی شناور ذخیره شد.",
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
  const support = settings.support ?? defaultSupportWidget;

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
        <p className="mt-2 text-[13px] leading-7 text-ink-500">
          بسته به سامانه، یا «کلید API» لازم است (کاوه‌نگار، قاصدک، sms.ir، فراز) یا «نام کاربری و رمز» (ملی‌پیامک، رایگان اس‌ام‌اس).
          برای ارسال کد ورود، بیشتر اپراتورها الگو (پترن) اجباری دارند؛ شناسه الگو را در فیلد مربوطه وارد کنید.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel htmlFor="sms-provider">سامانه</FieldLabel>
            <Select id="sms-provider" name="provider" defaultValue={settings.sms.provider}>
              {(Object.keys(SMS_PROVIDER_LABELS) as (keyof typeof SMS_PROVIDER_LABELS)[]).map((provider) => (
                <option key={provider} value={provider}>
                  {SMS_PROVIDER_LABELS[provider]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="sms-key">کلید API</FieldLabel>
            <Input id="sms-key" name="apiKey" defaultValue={settings.sms.apiKey} dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="sms-sender">شماره فرستنده / خط</FieldLabel>
            <Input id="sms-sender" name="sender" defaultValue={settings.sms.sender} dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="sms-username">نام کاربری (سامانه‌های یوزر/پس)</FieldLabel>
            <Input id="sms-username" name="username" defaultValue={settings.sms.username ?? ""} dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="sms-password">رمز عبور سامانه</FieldLabel>
            <Input
              id="sms-password"
              name="password"
              type="password"
              dir="ltr"
              className="text-left"
              placeholder={settings.sms.password ? "••••••••  (برای تغییر، مقدار جدید بنویسید)" : ""}
            />
          </div>
          <div>
            <FieldLabel htmlFor="sms-template">شناسه الگوی کد ورود</FieldLabel>
            <Input id="sms-template" name="otpTemplate" defaultValue={settings.sms.otpTemplate ?? ""} dir="ltr" className="text-left" placeholder="مثال: 100000" />
          </div>
          <div>
            <FieldLabel htmlFor="sms-template-param">نام پارامتر کد در الگو</FieldLabel>
            <Input id="sms-template-param" name="otpTemplateParam" defaultValue={settings.sms.otpTemplateParam ?? "code"} dir="ltr" className="text-left" />
          </div>
        </div>
        <button type="submit" className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
          ذخیره تنظیمات پیامک
        </button>
      </form>

      <form action={saveOtpSettings} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
          <KeyRound className="h-5 w-5 text-navy-800" />
          ورود با شماره موبایل و کد یک‌بارمصرف (OTP)
        </h2>
        <p className="mt-2 text-[13px] leading-7 text-ink-500">
          کد فقط به‌صورت هش ذخیره می‌شود، یک‌بارمصرف است و پس از انقضا بی‌اعتبار می‌شود.
          سقف ارسال در ساعت جلوی سوءاستفاده و هزینه پیامک بی‌مورد را می‌گیرد.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl bg-sand-100 px-4 py-3 text-sm font-bold">
            <input type="checkbox" name="enabled" defaultChecked={settings.otp?.enabled ?? true} className="h-4 w-4 accent-teal-600" />
            فعال بودن ورود با کد
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl bg-sand-100 px-4 py-3 text-sm font-bold">
            <input type="checkbox" name="allowRegistration" defaultChecked={settings.otp?.allowRegistration ?? true} className="h-4 w-4 accent-teal-600" />
            ثبت‌نام شماره جدید با کد
          </label>
          <div>
            <FieldLabel htmlFor="otp-length">طول کد</FieldLabel>
            <Select id="otp-length" name="codeLength" defaultValue={String(settings.otp?.codeLength ?? 6)}>
              <option value="4">۴ رقمی</option>
              <option value="5">۵ رقمی</option>
              <option value="6">۶ رقمی</option>
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="otp-ttl">اعتبار کد (دقیقه)</FieldLabel>
            <Input id="otp-ttl" name="ttlMinutes" inputMode="numeric" defaultValue={settings.otp?.ttlMinutes ?? 3} dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="otp-max">حداکثر ارسال در ساعت (هر شماره)</FieldLabel>
            <Input id="otp-max" name="maxPerHour" inputMode="numeric" defaultValue={settings.otp?.maxPerHour ?? 6} dir="ltr" className="text-left" />
          </div>
        </div>
        <button type="submit" className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
          ذخیره تنظیمات ورود با کد
        </button>
      </form>

      <form action={saveSupportWidgetSettings} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
          <Headphones className="h-5 w-5 text-teal-600" />
          دکمه پشتیبانی شناور
        </h2>
        <p className="mt-2 text-[13px] leading-7 text-ink-500">
          دکمه‌ای شناور در تمام صفحات سایت که با کلیک روی آن، راه‌های ارتباط سریع (تلگرام، واتساپ و…) باز می‌شود.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl bg-sand-100 px-4 py-3 text-sm font-bold">
            <input type="checkbox" name="enabled" defaultChecked={support.enabled} className="h-4 w-4 accent-teal-600" />
            نمایش در سایت
          </label>
          <div>
            <FieldLabel htmlFor="sw-title">عنوان</FieldLabel>
            <Input id="sw-title" name="title" defaultValue={support.title} />
          </div>
          <div className="lg:col-span-2">
            <FieldLabel htmlFor="sw-desc">توضیح کوتاه</FieldLabel>
            <Input id="sw-desc" name="description" defaultValue={support.description} />
          </div>
          <div>
            <FieldLabel htmlFor="sw-position">محل نمایش</FieldLabel>
            <Select id="sw-position" name="position" defaultValue={support.position}>
              <option value="bottom-left">پایین چپ</option>
              <option value="bottom-right">پایین راست</option>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <SupportChannelsManager initial={support.channels} />
        </div>
        <button type="submit" className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
          ذخیره دکمه پشتیبانی
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
