import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, KeyRound, Lock, ShieldCheck, ShieldOff, UserCog } from "lucide-react";
import { getSessionUser, can, roleLabels } from "@/lib/auth";
import { getAudit, getSessions, getSettings, getUsers } from "@/lib/store";
import { toFa } from "@/lib/format";
import { Denied } from "@/components/admin/Denied";
import { TableShell, Td } from "@/components/admin/TableShell";
import { FieldLabel, Input } from "@/components/ui/Input";
import { resetUserTotp, revokeUserSessions, saveSecuritySettings } from "../actions";

export const metadata: Metadata = { title: "امنیت پنل" };

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const me = await getSessionUser();
  if (!can(me, "security")) return <Denied />;
  const { saved } = await searchParams;
  const sec = getSettings().security;
  const staff = getUsers().filter((u) => u.role !== "student");
  const sessions = getSessions();
  const recentSecurity = getAudit().filter((e) => e.level === "security").slice(0, 8);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">امنیت پنل مدیریت</h1>
      {saved && (
        <p className="flex items-center gap-2 rounded-2xl bg-teal-50 px-5 py-3.5 text-sm font-bold text-teal-800 ring-1 ring-teal-600/25 ring-inset">
          <CheckCircle2 className="h-5 w-5" />
          {saved === "policy" ? "سیاست امنیتی ذخیره شد." : saved === "totp" ? "ورود دومرحله‌ای کاربر ریست شد." : "نشست‌های کاربر خارج شدند."}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <form action={saveSecuritySettings} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
            <Lock className="h-5 w-5 text-teal-600" />
            سیاست‌های ورود
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-sand-100 px-4 py-3 text-sm sm:col-span-2">
              <input type="checkbox" name="requireStaff2fa" defaultChecked={sec.requireStaff2fa} className="mt-1 h-4 w-4 accent-teal-600" />
              <span>
                <strong className="block text-navy-900">الزام ورود دومرحله‌ای برای همه همکاران</strong>
                <span className="text-xs leading-6 text-ink-600">
                  مدیر، ویراستار و پشتیبانی بدون فعال‌کردن Google Authenticator نمی‌توانند وارد پنل شوند (ابتدا به صفحه فعال‌سازی هدایت می‌شوند).
                </span>
              </span>
            </label>
            <div>
              <FieldLabel htmlFor="s-fails">حداکثر تلاش ناموفق قبل از قفل</FieldLabel>
              <Input id="s-fails" name="maxFailedLogins" inputMode="numeric" defaultValue={sec.maxFailedLogins} dir="ltr" className="text-left" />
            </div>
            <div>
              <FieldLabel htmlFor="s-lock">مدت قفل (دقیقه)</FieldLabel>
              <Input id="s-lock" name="lockMinutes" inputMode="numeric" defaultValue={sec.lockMinutes} dir="ltr" className="text-left" />
            </div>
            <div>
              <FieldLabel htmlFor="s-sess">مهلت نشست ادمین (دقیقه بی‌کاری)</FieldLabel>
              <Input id="s-sess" name="adminSessionMinutes" inputMode="numeric" defaultValue={sec.adminSessionMinutes} dir="ltr" className="text-left" />
            </div>
          </div>
          <button type="submit" className="mt-5 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
            ذخیره سیاست امنیتی
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-navy-900 p-5 text-white shadow-card">
            <p className="flex items-center gap-2 text-sm font-bold text-ochre-200"><ShieldCheck className="h-4 w-4" /> وضعیت شما</p>
            <p className="mt-2 text-sm leading-7 text-white/80">
              ورود دومرحله‌ای: <strong className={me!.totpEnabled ? "text-teal-200" : "text-madder-200"}>{me!.totpEnabled ? "فعال" : "غیرفعال"}</strong>
            </p>
            <Link href="/account/security" className="mt-3 inline-flex h-9 items-center rounded-lg bg-white/10 px-4 text-xs font-bold hover:bg-white/20">
              مدیریت حساب و Authenticator
            </Link>
          </div>
          <div className="rounded-2xl bg-card p-5 text-[13px] leading-7 text-ink-600 shadow-card ring-1 ring-ink-900/5">
            <p className="font-bold text-navy-900">لایه‌های امنیتی فعال</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>رمز عبور با scrypt هش می‌شود</li>
              <li>کوکی سشن HttpOnly + SameSite</li>
              <li>TOTP سازگار با Google Authenticator</li>
              <li>کدهای بازیابی یک‌بارمصرف (هش‌شده)</li>
              <li>قفل حساب پس از تلاش‌های ناموفق</li>
              <li>لاگ زنجیره‌ای غیرقابل‌دست‌کاری</li>
            </ul>
          </div>
        </aside>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-extrabold text-navy-900">
          <UserCog className="h-5 w-5 text-ochre-600" />
          همکاران و وضعیت دومرحله‌ای
        </h2>
        <TableShell head={["نام", "نقش", "دومرحله‌ای", "آخرین ورود", "نشست‌ها", "عملیات"]}>
          {staff.map((u) => {
            const count = sessions.filter((s) => s.userId === u.id).length;
            return (
              <tr key={u.id} className="transition-colors hover:bg-sand-50">
                <Td className="font-bold text-navy-900">
                  {u.name}
                  <span className="block text-[11px] text-ink-500" dir="ltr">{u.phone}</span>
                </Td>
                <Td><span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ink-700">{roleLabels[u.role]}</span></Td>
                <Td>
                  {u.totp?.enabled ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700"><ShieldCheck className="h-4 w-4" /> فعال</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-madder-700"><ShieldOff className="h-4 w-4" /> غیرفعال</span>
                  )}
                </Td>
                <Td className="text-xs text-ink-600">
                  {u.lastLoginAt ? <span dir="ltr">{new Date(u.lastLoginAt).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" })}</span> : "—"}
                  {u.lastLoginIp && <span className="block text-ink-400" dir="ltr">{u.lastLoginIp}</span>}
                </Td>
                <Td className="font-bold">{toFa(count)}</Td>
                <Td>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {u.totp?.enabled && u.id !== me!.id && (
                      <form action={resetUserTotp}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-ochre-100 px-3 text-[11px] font-bold text-ochre-700 hover:bg-ochre-200" title="اگر گوشی را گم کرده">
                          <KeyRound className="h-3.5 w-3.5" /> ریست 2FA
                        </button>
                      </form>
                    )}
                    {count > 0 && u.id !== me!.id && (
                      <form action={revokeUserSessions}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="h-8 cursor-pointer rounded-lg bg-madder-50 px-3 text-[11px] font-bold text-madder-700 hover:bg-madder-100">خروج اجباری</button>
                      </form>
                    )}
                  </span>
                </Td>
              </tr>
            );
          })}
        </TableShell>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold text-navy-900">آخرین رویدادهای امنیتی</h2>
          <Link href="/admin/audit?level=security" className="text-[13px] font-bold text-teal-600 hover:text-teal-700">همه در لاگ سیستم ←</Link>
        </div>
        <ul className="divide-y divide-ink-900/5 rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
          {recentSecurity.length === 0 && <li className="p-6 text-center text-sm text-ink-500">هنوز رویدادی ثبت نشده.</li>}
          {recentSecurity.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <span className="font-bold text-navy-900">{e.action}</span>
              <span className="text-ink-600">{e.actorName ?? "مهمان"}</span>
              <span className="text-xs text-ink-500" dir="ltr">{e.ip} • {new Date(e.ts).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" })}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
