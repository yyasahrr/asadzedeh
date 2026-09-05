"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { FieldLabel, Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { login, register } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

const errors: Record<string, string> = {
  invalid: "شماره موبایل یا رمز عبور اشتباه است.",
  dup: "این شماره قبلاً ثبت شده؛ وارد شوید.",
  validation: "اطلاعات را کامل وارد کنید (رمز حداقل ۶ رقم).",
};

export function AuthTabs({ initialTab, error }: { initialTab: "login" | "register"; error?: string }) {
  const [tab, setTab] = useState<"login" | "register">(initialTab);

  return (
    <div>
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
          <div>
            <FieldLabel htmlFor="auth-phone">شماره موبایل</FieldLabel>
            <Input id="auth-phone" name="phone" required inputMode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="auth-pass">رمز عبور</FieldLabel>
            <Input id="auth-pass" name="password" type="password" required placeholder="••••••••" dir="ltr" className="text-left" autoComplete="current-password" />
          </div>
          <Button type="submit" size="lg" className="w-full">ورود به حساب</Button>
        </form>
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
        با ورود یا ثبت‌نام، <Link href="#" className="font-bold text-navy-800">قوانین و مقررات</Link> اسدزاده را می‌پذیرید.
      </p>

      <details className="mt-5 rounded-xl bg-sand-100 p-4 text-[13px] leading-7 text-ink-600">
        <summary className="cursor-pointer font-bold text-navy-900">حساب‌های نمایشی (برای تست)</summary>
        <ul className="mt-2 space-y-1">
          <li>مدیر کل: <span dir="ltr" className="font-bold">09120000001 / admin123</span></li>
          <li>ویراستار: <span dir="ltr" className="font-bold">09120000002 / editor123</span></li>
          <li>پشتیبانی: <span dir="ltr" className="font-bold">09120000003 / support123</span></li>
          <li>هنرجو: <span dir="ltr" className="font-bold">09123456789 / sara1234</span></li>
        </ul>
      </details>
    </div>
  );
}
