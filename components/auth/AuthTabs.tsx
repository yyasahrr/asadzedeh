"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { FieldLabel, Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { cn } from "@/lib/utils";

export function AuthTabs() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [done, setDone] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-teal-600" />
        <h2 className="text-xl font-black text-navy-900">
          {tab === "login" ? "خوش برگشتید!" : "حساب شما ساخته شد!"}
        </h2>
        <p className="text-sm leading-7 text-ink-600">
          این یک نمونه نمایشی است؛ در نسخه نهایی، ورود با پیامک انجام می‌شود.
        </p>
        <Button href="/dashboard" size="lg" className="mt-2">ورود به پنل هنرجو</Button>
      </div>
    );
  }

  return (
    <div>
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

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {tab === "register" && (
          <div>
            <FieldLabel htmlFor="auth-name">نام و نام خانوادگی</FieldLabel>
            <Input id="auth-name" required placeholder="مثلاً سارا محمدی" autoComplete="name" />
          </div>
        )}
        <div>
          <FieldLabel htmlFor="auth-phone">شماره موبایل</FieldLabel>
          <Input id="auth-phone" required inputMode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" className="text-left" />
        </div>
        {tab === "login" && (
          <div>
            <FieldLabel htmlFor="auth-pass">رمز عبور</FieldLabel>
            <Input id="auth-pass" type="password" required placeholder="••••••••" dir="ltr" className="text-left" autoComplete="current-password" />
          </div>
        )}
        <Button type="submit" size="lg" className="w-full">
          {tab === "login" ? "ورود به حساب" : "ساخت حساب کاربری"}
        </Button>
        <p className="text-center text-xs leading-6 text-ink-500">
          با ورود یا ثبت‌نام، <Link href="#" className="font-bold text-navy-800">قوانین و مقررات</Link> اسدزاده را می‌پذیرید.
        </p>
      </form>
    </div>
  );
}
