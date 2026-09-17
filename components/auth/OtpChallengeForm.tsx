"use client";

import { useEffect, useRef, useState } from "react";
import { changeOtpPhoneAction, resendOtpAction, verifyOtpAction } from "@/app/auth/actions";
import { toPersianDigits } from "@/lib/jalali-date";
import { OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/otp-constants";

function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return toPersianDigits(`${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`);
}

export function OtpChallengeForm({ maskedPhone, expiresAt, resendAvailableAt }: {
  maskedPhone: string;
  expiresAt: number;
  resendAvailableAt: number;
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [now, setNow] = useState(resendAvailableAt - OTP_RESEND_COOLDOWN_SECONDS * 1000);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const immediate = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(timer);
    };
  }, []);

  const expiry = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resend = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  const expired = expiry === 0;
  const code = digits.join("");

  const apply = (index: number, value: string) => {
    const normalized = value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/\D/g, "");
    if (!normalized) {
      setDigits((current) => current.map((digit, itemIndex) => itemIndex === index ? "" : digit));
      return;
    }
    const next = [...digits];
    normalized.slice(0, 6 - index).split("").forEach((digit, offset) => { next[index + offset] = digit; });
    setDigits(next);
    inputs.current[Math.min(index + normalized.length, 5)]?.focus();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-sand-100 px-4 py-3 text-center text-sm leading-7 text-ink-700">
        کد ورود به شماره <bdi dir="ltr" className="font-black text-navy-900">{toPersianDigits(maskedPhone)}</bdi> ارسال شد.
      </div>
      <form action={verifyOtpAction} className="space-y-4">
        <input type="hidden" name="code" value={code} />
        <fieldset disabled={expired}>
          <legend className="sr-only">کد شش رقمی ورود</legend>
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2" dir="ltr">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => { inputs.current[index] = element; }}
                value={digit}
                onChange={(event) => apply(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
                  if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
                  if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus();
                }}
                onPaste={(event) => { event.preventDefault(); apply(0, event.clipboardData.getData("text")); }}
                aria-label={`رقم ${index + 1} از ۶`}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                autoFocus={index === 0}
                maxLength={index === 0 ? 6 : 1}
                className="h-12 min-w-0 rounded-lg border border-ink-900/15 bg-card text-center text-xl font-black text-navy-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:bg-sand-100"
              />
            ))}
          </div>
        </fieldset>

        <div className="grid gap-2 rounded-xl border border-ink-900/8 px-4 py-3 text-xs font-bold sm:grid-cols-2">
          <p className={expired ? "text-madder-700" : "text-ink-600"}>{expired ? "کد منقضی شده است." : <>اعتبار کد: <bdi dir="ltr">{clock(expiry)}</bdi></>}</p>
          <p className="text-ink-600 sm:text-left">{resend > 0 ? <>ارسال مجدد تا <bdi dir="ltr">{clock(resend)}</bdi></> : "امکان ارسال مجدد فراهم است."}</p>
        </div>
        {expired ? <p role="alert" className="text-center text-sm font-bold text-madder-700">کد منقضی شده است. کد جدید دریافت کنید.</p> : null}
        <button type="submit" disabled={expired || code.length !== 6} className="h-11 w-full rounded-xl bg-navy-800 text-sm font-bold text-white transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-45">ورود</button>
      </form>

      <div className="grid gap-2 text-xs font-bold sm:grid-cols-2">
        <form action={resendOtpAction}>
          <button type="submit" disabled={resend > 0} className="min-h-11 w-full rounded-xl border border-teal-700/25 text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-45">ارسال مجدد کد</button>
        </form>
        <form action={changeOtpPhoneAction}>
          <button type="submit" className="min-h-11 w-full rounded-xl text-navy-800 underline-offset-4 hover:bg-sand-100 hover:underline">تغییر شماره موبایل</button>
        </form>
      </div>
    </div>
  );
}
