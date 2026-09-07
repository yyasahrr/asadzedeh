"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { FieldLabel, Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { login, register, requestPasswordResetAction, resetPasswordAction } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

const errors: Record<string, string> = {
  invalid: "شماره موبایل یا رمز عبور اشتباه است.",
  dup: "این شماره قبلاً ثبت شده؛ وارد شوید.",
  validation: "اطلاعات را کامل وارد کنید (شماره معتبر و رمز حداقل ۶ رقم).",
  locked: "به‌دلیل تلاش‌های ناموفق زیاد، حساب موقتاً قفل شده است. چند دقیقه بعد دوباره تلاش کنید.",
  expired: "زمان تأیید دومرحله‌ای تمام شد؛ دوباره وارد شوید.",
  missing: "کد بازیابی یافت نشد یا پیش‌تر استفاده شده است.",
  attempts: "تعداد تلاش‌های ناموفق بیش از حد مجاز است؛ کد جدید درخواست دهید.",
};

const notices: Record<string, string> = {
  sent: "اگر این شماره در اسدزاده ثبت شده باشد، کد بازیابی پیامک شد. کد ۱۵ دقیقه اعتبار دارد.",
  reset: "رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.",
};

export function AuthTabs({
  initialTab,
  error,
  notice,
  next,
}: {
  initialTab: "login" | "register" | "reset";
  error?: string;
  notice?: string;
  next?: string;
}) {
  const [tab, setTab] = useState<"login" | "register" | "reset">(initialTab);
  // The reset action redirects back with sent=1, so the step is driven by the
  // URL rather than client state — a reload must not lose the user's place.
  const sent = notice === "sent";

  return (
    <div>
      {notice && notices[notice] && (
        <p className="mb-4 rounded-xl bg-sage-50 px-4 py-3 text-sm font-bold text-sage-800 ring-1 ring-sage-800/20 ring-inset">
          {notices[notice]}
        </p>
      )}

      {error && errors[error] && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-madder-50 px-4 py-3 text-sm font-bold text-madder-700 ring-1 ring-madder-700/20 ring-inset">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {errors[error]}
        </p>
      )}

      <div className="grid grid-cols-2 rounded-xl bg-sand-100 p-1" role="tablist" aria-label="ورود یا ثبت‌نام">
        {(
          [
            { id: "login", label: "ورود" },
            { id: "register", label: "ثبت‌نام" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-11 cursor-pointer rounded-lg text-[15px] font-bold transition-all",
              tab === t.id ? "bg-card text-navy-900 shadow-card" : "text-ink-500 hover:text-ink-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "login" ? (
        <form action={login} className="mt-6 space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div>
            <FieldLabel htmlFor="auth-phone">شماره موبایل</FieldLabel>
            <Input id="auth-phone" name="phone" required inputMode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="auth-pass">رمز عبور</FieldLabel>
            <Input id="auth-pass" name="password" type="password" required placeholder="••••••••" dir="ltr" className="text-left" autoComplete="current-password" />
          </div>
          <Button type="submit" size="lg" className="w-full">ورود به حساب</Button>
          <button
            type="button"
            onClick={() => setTab("reset")}
            className="w-full cursor-pointer text-center text-xs font-bold text-navy-800 underline-offset-4 hover:underline"
          >
            رمز عبورم را فراموش کرده‌ام
          </button>
        </form>
      ) : tab === "reset" ? (
        <div className="mt-6 space-y-4">
          {!sent ? (
            <form action={requestPasswordResetAction} className="space-y-4">
              <div>
                <FieldLabel htmlFor="reset-phone">شماره موبایل</FieldLabel>
                <Input id="reset-phone" name="phone" required inputMode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" className="text-left" />
              </div>
              <Button type="submit" size="lg" className="w-full">ارسال کد بازیابی</Button>
              <button
                type="button"
                onClick={() => setTab("login")}
                className="w-full cursor-pointer text-center text-xs font-bold text-navy-800 underline-offset-4 hover:underline"
              >
                بازگشت به ورود
              </button>
            </form>
          ) : (
            <form action={resetPasswordAction} className="space-y-4">
              <div>
                <FieldLabel htmlFor="reset-phone2">شماره موبایل</FieldLabel>
                <Input id="reset-phone2" name="phone" required inputMode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" className="text-left" />
              </div>
              <div>
                <FieldLabel htmlFor="reset-code">کد بازیابی ۸ رقمی</FieldLabel>
                <Input id="reset-code" name="code" required inputMode="numeric" maxLength={8} placeholder="۱۲۳۴۵۶۷۸" dir="ltr" className="text-left" />
              </div>
              <div>
                <FieldLabel htmlFor="reset-pass">رمز عبور جدید</FieldLabel>
                <Input id="reset-pass" name="password" type="password" required minLength={10} placeholder="••••••••" dir="ltr" className="text-left" autoComplete="new-password" />
              </div>
              <Button type="submit" size="lg" className="w-full">تغییر رمز عبور</Button>
            </form>
          )}
        </div>
      ) : (
        <form action={register} className="mt-6 space-y-4">
          <div>
            <FieldLabel htmlFor="reg-name">نام و نام خانوادگی</FieldLabel>
            <Input id="reg-name" name="name" required placeholder="مثلاً سارا محمدی" autoComplete="name" />
          </div>
          <div>
            <FieldLabel htmlFor="reg-phone">شماره موبایل</FieldLabel>
            <Input id="reg-phone" name="phone" required inputMode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="reg-pass">رمز عبور (حداقل ۶ رقم)</FieldLabel>
            <Input id="reg-pass" name="password" type="password" required minLength={6} placeholder="••••••••" dir="ltr" className="text-left" autoComplete="new-password" />
          </div>
          <Button type="submit" size="lg" className="w-full">ساخت حساب کاربری</Button>
        </form>
      )}

      <p className="mt-4 text-center text-xs leading-6 text-ink-500">
        با ورود یا ثبت‌نام، <Link href="/terms" className="font-bold text-navy-800">قوانین و مقررات</Link> اسدزاده را می‌پذیرید.
      </p>

      <details className="mt-5 rounded-xl bg-sand-100 p-4 text-[13px] leading-7 text-ink-600">
        <summary className="cursor-pointer font-bold text-navy-900">حساب‌های نمایشی (برای تست)</summary>
        <ul className="mt-2 space-y-1">
          <li>مدیر کل: <span dir="ltr" className="font-bold">09120000001 / admin123</span></li>
          <li>ویراستار: <span dir="ltr" className="font-bold">09120000002 / editor123</span></li>
          <li>پشتیبانی: <span dir="ltr" className="font-bold">09120000003 / support123</span></li>
          <li>استاد (پنل اساتید): <span dir="ltr" className="font-bold">09120000004 / dyer1234</span></li>
          <li>هنرجو: <span dir="ltr" className="font-bold">09123456789 / sara1234</span></li>
        </ul>
      </details>
    </div>
  );
}
