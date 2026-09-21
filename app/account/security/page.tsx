import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AlertCircle, CheckCircle2, KeyRound, MonitorSmartphone, ShieldCheck, ShieldOff } from "lucide-react";
import { getSessionUser, isInstructor, isStaff, roleLabels } from "@/lib/auth";
import { getSessions, getSettings, getUserById } from "@/lib/store";
import { toFa } from "@/lib/format";
import { PageHero } from "@/components/PageHero";
import { FieldLabel, Input } from "@/components/ui/Input";
import { TotpSetup } from "@/components/account/TotpSetup";
import { RegenerateRecovery } from "@/components/account/RegenerateRecovery";
import { cancelPhoneChange, changePassword, disableTotp, requestPhoneChange, resendPhoneChange, revokeOtherSessions, verifyPhoneChange } from "./actions";
import { maskPhone, PHONE_CHANGE_COOKIE, readPhoneChangeChallenge } from "@/lib/phone-change";

export const metadata: Metadata = { title: "امنیت حساب" };

const messages: Record<string, { ok: boolean; text: string }> = {
  disabled: { ok: true, text: "ورود دومرحله‌ای غیرفعال شد." },
  password: { ok: true, text: "رمز عبور تغییر کرد و سایر نشست‌ها خارج شدند." },
  sessions: { ok: true, text: "سایر نشست‌ها خارج شدند." },
  phone: { ok: true, text: "شماره موبایل ورود با موفقیت تغییر کرد و سایر نشست‌ها خارج شدند." },
  verify: { ok: false, text: "رمز عبور یا کد تأیید اشتباه بود." },
  "password-error": { ok: false, text: "رمز فعلی اشتباه است یا رمز جدید کوتاه‌تر از ۸ کاراکتر است." },
};

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; required?: string; phoneStep?: string; phoneError?: string; resent?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/auth?next=/account/security");
  const { saved, error, required, phoneStep, phoneError, resent } = await searchParams;
  const user = getUserById(me.id)!;
  const policy = getSettings().security;
  const sessions = getSessions().filter((s) => s.userId === me.id);
  const msg = saved ? messages[saved] : error ? messages[error === "password" ? "password-error" : error] : null;
  const back = isInstructor(me) ? "/instructor" : isStaff(me) ? "/admin" : "/dashboard";
  const phoneChallenge = readPhoneChangeChallenge((await cookies()).get(PHONE_CHANGE_COOKIE)?.value);
  const phoneErrors: Record<string, string> = {
    password: "رمز فعلی صحیح نیست.", format: "شماره جدید باید یک موبایل معتبر ایرانی باشد.", same: "شماره جدید با شماره فعلی یکسان است.",
    duplicate: "این شماره قبلاً برای حساب دیگری ثبت شده است.", rate: "تعداد تلاش‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید.",
    cooldown: "ارسال مجدد هنوز مجاز نیست.", sms: "ارسال کد به شماره جدید انجام نشد؛ تنظیمات پیامک را بررسی کنید.",
    challenge: "درخواست تغییر شماره معتبر نیست یا منقضی شده است.", expired: "کد منقضی شده است؛ دوباره درخواست دهید.",
    invalid: "کد واردشده صحیح نیست.", attempts: "تعداد تلاش‌های کد بیش از حد مجاز است.", missing: "کد یافت نشد یا قبلاً استفاده شده است.",
    stale: "اطلاعات حساب یا شماره مقصد تغییر کرده است؛ درخواست جدید بسازید.", account: "این حساب اجازه تغییر شماره ندارد.",
  };

  return (
    <>
      <PageHero
        compact
        title="امنیت حساب کاربری"
        crumbs={[{ href: "/", label: "خانه" }, { href: back, label: "پنل" }, { label: "امنیت" }]}
      />
      <div className="shell max-w-4xl space-y-5 py-8">
        {required && (
          <p className="flex items-center gap-2 rounded-2xl bg-ochre-100/70 px-5 py-3.5 text-sm font-bold text-ochre-700 ring-1 ring-ochre-600/30 ring-inset">
            <AlertCircle className="h-5 w-5 shrink-0" />
            طبق سیاست امنیتی سایت، ورود به پنل مدیریت فقط با فعال‌بودن ورود دومرحله‌ای ممکن است. لطفاً همین حالا فعالش کنید.
          </p>
        )}
        {msg && (
          <p className={`flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold ring-1 ring-inset ${msg.ok ? "bg-teal-50 text-teal-800 ring-teal-600/25" : "bg-madder-50 text-madder-700 ring-madder-700/25"}`}>
            {msg.ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {msg.text}
          </p>
        )}
        {phoneError && phoneErrors[phoneError] && <p role="alert" className="rounded-xl bg-madder-50 px-4 py-3 text-sm font-bold text-madder-700 ring-1 ring-madder-700/20 ring-inset">{phoneErrors[phoneError]}</p>}

        {me.role === "super_admin" && <section className="rounded-xl border border-ink-900/10 bg-card p-5">
          <h2 className="text-lg font-black text-navy-900">تغییر شماره موبایل</h2>
          <p className="mt-1 text-sm leading-7 text-ink-600">شماره موبایل شناسه ورود شماست. تأیید با رمز فعلی و کدی که فقط به شماره جدید ارسال می‌شود انجام خواهد شد.</p>
          {phoneStep === "verify" && phoneChallenge?.userId === me.id ? <div className="mt-4 space-y-4">
            <p className="rounded-lg bg-sand-100 px-4 py-3 text-sm text-ink-700">کد به <bdi dir="ltr" className="font-bold">{maskPhone(phoneChallenge.newPhone)}</bdi> ارسال شد.{resent === "1" ? " کد جدید جایگزین قبلی شد." : ""}</p>
            <div data-testid="phone-change-verification-actions" className="grid gap-3 sm:grid-cols-2">
              <form action={verifyPhoneChange} className="grid gap-3 sm:col-span-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <div><FieldLabel htmlFor="phone-change-code">کد یکبارمصرف</FieldLabel><Input id="phone-change-code" name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" className="text-left" /></div>
                <button type="submit" className="h-11 rounded-lg bg-navy-800 px-6 text-sm font-bold text-white hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">تأیید و تغییر شماره</button>
              </form>
              <form action={resendPhoneChange} className="sm:justify-self-start"><button type="submit" className="min-h-10 rounded-lg border border-teal-700/25 px-4 text-xs font-bold text-teal-700 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">ارسال مجدد کد</button></form>
              <form action={cancelPhoneChange} className="sm:justify-self-end"><button type="submit" className="min-h-10 rounded-lg px-4 text-xs font-bold text-ink-600 hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">لغو درخواست</button></form>
            </div>
          </div> : <form action={requestPhoneChange} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><FieldLabel htmlFor="phone-current-password">رمز عبور فعلی</FieldLabel><Input id="phone-current-password" name="currentPassword" type="password" required autoComplete="current-password" dir="ltr" className="text-left" /></div>
            <div><FieldLabel htmlFor="phone-new">شماره موبایل جدید</FieldLabel><Input id="phone-new" name="newPhone" required inputMode="tel" autoComplete="tel" placeholder="09123456789" dir="ltr" className="text-left" /></div>
            <button type="submit" className="h-11 rounded-lg bg-navy-800 px-6 text-sm font-bold text-white hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:col-span-2 sm:w-fit">ارسال کد به شماره جدید</button>
          </form>}
        </section>}

        {me.role === "super_admin" ? <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-navy-900">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
                ورود دومرحله‌ای (Google Authenticator)
              </h2>
              <p className="mt-1 text-sm leading-7 text-ink-600">
                Google Authenticator به‌صورت اختیاری برای تأیید عملیات حساس در دسترس است. فعال‌بودن آن به‌تنهایی ورود عادی با رمز یا پیامک را دومرحله‌ای نمی‌کند.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${user.totp?.enabled ? "bg-teal-50 text-teal-700 ring-teal-600/25" : "bg-sand-200/70 text-ink-700 ring-ink-900/15"}`}>
              {user.totp?.enabled ? "فعال" : "غیرفعال"}
            </span>
          </div>
          <div className="mt-5">
            {user.totp?.enabled ? (
              <div className="space-y-5">
                <p className="text-sm text-ink-600">
                  فعال‌شده در: <span dir="ltr">{user.totp.enabledAt ? new Date(user.totp.enabledAt).toLocaleString("fa-IR") : "—"}</span> •
                  کدهای بازیابی باقی‌مانده: <strong>{toFa(user.totp.recoveryCodes.length)}</strong>
                </p>
                <RegenerateRecovery />
                <details className="rounded-xl bg-madder-50 p-4 ring-1 ring-madder-700/20">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-madder-700">
                    <ShieldOff className="h-4 w-4" />
                    غیرفعال‌کردن ورود دومرحله‌ای
                  </summary>
                  <form action={disableTotp} className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <FieldLabel htmlFor="d-pass">رمز عبور</FieldLabel>
                      <Input id="d-pass" name="password" type="password" required dir="ltr" />
                    </div>
                    <div>
                      <FieldLabel htmlFor="d-code">کد فعلی</FieldLabel>
                      <Input id="d-code" name="code" required inputMode="numeric" dir="ltr" />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="h-11 w-full cursor-pointer rounded-xl bg-madder-700 font-bold text-white hover:bg-madder-600">غیرفعال شود</button>
                    </div>
                  </form>
                </details>
              </div>
            ) : (
              <TotpSetup />
            )}
          </div>
          {policy.requireStaff2fa && isStaff(me) && (
            <p className="mt-4 text-xs text-ink-500">سیاست سایت: ورود دومرحله‌ای برای همه همکاران الزامی است.</p>
          )}
        </section> : <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="flex items-center gap-2 text-lg font-black text-navy-900"><MonitorSmartphone className="h-5 w-5 text-teal-600" />ورود امن با کد پیامکی</h2>
          <p className="mt-2 text-sm leading-7 text-ink-600">ورود حساب شما فقط با کد یک‌بارمصرف ارسال‌شده به شماره موبایل انجام می‌شود و نیازی به Google Authenticator ندارید.</p>
        </section>}

        {me.role === "super_admin" ? <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="flex items-center gap-2 text-lg font-black text-navy-900">
            <KeyRound className="h-5 w-5 text-ochre-600" />
            تغییر رمز عبور
          </h2>
          <form action={changePassword} className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="p-cur">رمز فعلی</FieldLabel>
              <Input id="p-cur" name="current" type="password" required dir="ltr" autoComplete="current-password" />
            </div>
            <div>
              <FieldLabel htmlFor="p-new">رمز جدید (حداقل ۸ کاراکتر)</FieldLabel>
              <Input id="p-new" name="next" type="password" required minLength={8} dir="ltr" autoComplete="new-password" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="h-11 w-full cursor-pointer rounded-xl bg-navy-800 font-bold text-white hover:bg-navy-700">ذخیره رمز</button>
            </div>
          </form>
        </section> : null}

        <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black text-navy-900">
              <MonitorSmartphone className="h-5 w-5 text-navy-700" />
              نشست‌های فعال ({toFa(sessions.length)})
            </h2>
            {sessions.length > 1 && (
              <form action={revokeOtherSessions}>
                <button type="submit" className="h-9 cursor-pointer rounded-lg bg-sand-200 px-4 text-xs font-bold text-ink-800 hover:bg-sand-300">خروج از سایر دستگاه‌ها</button>
              </form>
            )}
          </div>
          <ul className="mt-4 divide-y divide-ink-900/5 text-sm">
            {sessions.map((s) => (
              <li key={s.token} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="truncate text-ink-700" dir="ltr">{s.userAgent || "—"}</span>
                <span className="text-xs text-ink-500">
                  IP: <span dir="ltr">{s.ip ?? "—"}</span> • {s.createdAt}
                  {s.token === me.sessionToken && <strong className="ms-2 text-teal-700">(این دستگاه)</strong>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-500">نقش شما: {roleLabels[me.role]} • <Link href={back} className="font-bold text-teal-700 hover:underline">بازگشت به پنل</Link></p>
        </section>
      </div>
    </>
  );
}
