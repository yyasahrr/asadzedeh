import type { Metadata } from "next";
import { KeyRound, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getInstructors, getSettings, getUsers } from "@/lib/store";
import { accountBlockReason, effectivePermissions, getSessionUser, isSuperAdmin, permissionLabels, roleLabels } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { TableShell, Td } from "@/components/admin/TableShell";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import { addStaff, updateStaffAccess } from "../actions";
import { splitOwnerAndStaff } from "@/lib/staff-users";

export const metadata: Metadata = { title: "کاربران و دسترسی" };

const staffRoles: Role[] = ["manager", "editor", "support", "instructor"];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!isSuperAdmin(user)) return <Denied />;
  const sessionOwner = user!;
  const { error } = await searchParams;
  const { owner, staff: users } = splitOwnerAndStaff(getUsers(), sessionOwner.id);
  const profiles = getSettings().accessProfiles ?? [];
  const instructors = getInstructors();
  const linkedInstructorIds = new Set(instructors.map((item) => item.userId).filter(Boolean));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-black text-navy-900">کاربران و سطوح دسترسی</h1><Link href="/admin/users/access-profiles" className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-bold text-white hover:bg-navy-700">مدیریت پروفایل‌های دسترسی</Link></div>
      {error === "dup" && (
        <p className="rounded-2xl bg-madder-50 px-5 py-3.5 text-sm font-bold text-madder-700 ring-1 ring-madder-700/25 ring-inset">
          این شماره موبایل قبلاً ثبت شده است.
        </p>
      )}
      {error === "student" && (
        <p role="alert" className="rounded-xl bg-madder-50 px-4 py-3 text-sm font-bold text-madder-700 ring-1 ring-madder-700/25 ring-inset">
          حساب هنرجو از این بخش قابل مدیریت یا تبدیل به حساب همکار نیست.
        </p>
      )}

      {owner && (
        <section aria-labelledby="owner-title" className="rounded-xl border border-teal-700/20 bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-bold text-teal-700"><ShieldCheck className="h-4 w-4" />مالک سیستم</p>
              <h2 id="owner-title" className="mt-1 truncate text-lg font-black text-navy-900">{owner.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-600">
                <bdi dir="ltr">{owner.phone}</bdi>
                <span aria-hidden="true">•</span>
                <span>{roleLabels[owner.role]}</span>
                <span className={`rounded-full px-2 py-1 font-bold ${owner.disabled || accountBlockReason(owner) ? "bg-madder-50 text-madder-700" : "bg-teal-50 text-teal-700"}`}>
                  {owner.disabled || accountBlockReason(owner) ? "غیرفعال" : "فعال"}
                </span>
                <span className="rounded-full bg-sand-100 px-2 py-1 font-bold text-ink-700">ورود دومرحله‌ای: {owner.totp?.enabled ? "فعال" : "غیرفعال"}</span>
              </div>
            </div>
            <Link href="/account/security" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-teal-700/25 px-4 text-sm font-bold text-teal-700 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
              <KeyRound className="h-4 w-4" />امنیت حساب مالک
            </Link>
          </div>
        </section>
      )}

      <details className="group rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
        <summary className="flex cursor-pointer items-center gap-2 p-4 font-extrabold text-navy-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white transition-transform group-open:rotate-45">
            <Plus className="h-4 w-4" />
          </span>
          افزودن همکار جدید
        </summary>
        <form action={addStaff} className="grid gap-4 border-t border-dashed border-ink-900/10 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <FieldLabel htmlFor="u-name">نام *</FieldLabel>
            <Input id="u-name" name="name" required />
          </div>
          <div>
            <FieldLabel htmlFor="u-profile">سطح دسترسی</FieldLabel>
            <Select id="u-profile" name="accessProfileId" defaultValue="content">
              <option value="">پیش‌فرض نقش</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="u-phone">موبایل *</FieldLabel>
            <Input id="u-phone" name="phone" required inputMode="tel" dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="u-pass">رمز داخلی (اختیاری)</FieldLabel>
            <Input id="u-pass" name="password" type="password" minLength={8} dir="ltr" className="text-left" autoComplete="new-password" />
            <p className="mt-1 text-xs text-ink-500">ورود همکار با کد یک‌بارمصرف موبایل انجام می‌شود.</p>
          </div>
          <div>
            <FieldLabel htmlFor="u-role">نقش</FieldLabel>
            <Select id="u-role" name="role" defaultValue="editor">
              {staffRoles.map((r) => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="u-instructor">اتصال به پروفایل مدرس</FieldLabel>
            <Select id="u-instructor" name="instructorSlug" defaultValue=""><option value="">بدون اتصال</option>{instructors.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</Select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-teal-600 px-6 text-sm font-bold text-white transition-colors hover:bg-teal-700">
              ثبت همکار
            </button>
          </div>
        </form>
      </details>

      <div className="grid gap-4 rounded-2xl bg-card p-5 text-[13px] leading-7 text-ink-600 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
        <p><strong className="text-navy-900">مدیر کل:</strong> همه دسترسی‌ها + مدیریت کاربران و تنظیمات.</p>
        <p><strong className="text-navy-900">مدیر:</strong> همه بخش‌ها به‌جز کاربران و تنظیمات.</p>
        <p><strong className="text-navy-900">ویراستار:</strong> دوره‌ها، کلاس‌ها، مقالات، رسانه، محتوا و نظرات.</p>
        <p><strong className="text-navy-900">پشتیبانی:</strong> هنرجویان، سفارش‌ها، تمرین‌ها، گواهی‌ها و نظرات.</p>
      </div>

      <TableShell head={["نام", "موبایل", "نقش", "عضویت", "تغییر نقش"]}>
        {users.map((u) => (
          <tr key={u.id} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-900">
              {u.name}
              {u.disabled ? (
                <span
                  className="ms-1 rounded-full bg-madder-50 px-2 py-1 text-[10px] font-bold text-madder-700"
                  title={u.disabledReason || "حساب غیرفعال"}
                >
                  غیرفعال
                </span>
              ) : (
                accountBlockReason(u) && (
                  <span
                    className="ms-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700"
                    title="تا زمانی که رمز توسعه تغییر نکند، ورود رد می‌شود"
                  >
                    رمز توسعه
                  </span>
                )
              )}
            </Td>
            <Td><span dir="ltr" className="text-ink-600">{u.phone}</span></Td>
            <Td>
              <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ink-700">{roleLabels[u.role]}</span>
              {u.totp?.enabled && <span className="ms-1 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700">2FA</span>}
              {linkedInstructorIds.has(u.id) && <span className="ms-1 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700">متصل به مدرس</span>}
              {u.accessProfileId && <small className="mt-1 block text-ink-500">{profiles.find((profile) => profile.id === u.accessProfileId)?.name ?? u.accessProfileId}</small>}
            </Td>
            <Td className="whitespace-nowrap text-ink-600">{u.createdAt}</Td>
            <Td>
                <form action={updateStaffAccess} className="min-w-[280px] space-y-2 rounded-lg border border-ink-900/10 p-3">
                  <input type="hidden" name="id" value={u.id} />
                  <label htmlFor={`rl-${u.id}`} className="sr-only">نقش {u.name}</label>
                  <select
                    id={`rl-${u.id}`}
                    name="role"
                    defaultValue={u.role}
                    className="h-9 cursor-pointer rounded-lg border border-ink-900/10 bg-white px-2 text-[13px] font-bold focus:border-teal-600 focus:outline-none"
                  >
                    {u.role === "admin" && <option value="admin">{roleLabels.admin}</option>}
                    {staffRoles.map((r) => (
                      <option key={r} value={r}>{roleLabels[r]}</option>
                    ))}
                  </select>
                  <select name="accessProfileId" defaultValue={u.accessProfileId ?? ""} aria-label={`سطح دسترسی ${u.name}`} className="h-9 rounded-lg border border-ink-900/10 bg-white px-2 text-xs">
                    <option value="">پیش‌فرض نقش</option>
                    {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                  </select>
                  <select name="instructorSlug" defaultValue={instructors.find((item) => item.userId === u.id)?.slug ?? ""} aria-label={`پروفایل مدرس ${u.name}`} className="h-9 rounded-lg border border-ink-900/10 bg-white px-2 text-xs"><option value="">بدون مدرس</option>{instructors.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
                  <details className="text-xs"><summary className="cursor-pointer font-bold text-teal-700">مجوزهای مؤثر و استثناها</summary><p className="mt-2 leading-6 text-ink-600">{effectivePermissions({ ...u, totpEnabled: Boolean(u.totp?.enabled), mfaVerified: false, sessionToken: "" }).map((permission) => permissionLabels[permission]).join("، ") || "بدون دسترسی مدیریتی"}</p><div className="mt-2 grid grid-cols-2 gap-2"><fieldset><legend className="font-bold">اجازه اضافه</legend>{Object.entries(permissionLabels).map(([permission, label]) => { const ownerOnly = permission === "users" || permission === "security"; return <label key={permission} className={`block ${ownerOnly ? "text-ink-400" : ""}`}><input type="checkbox" name="permissionAllow" value={permission} defaultChecked={!ownerOnly && u.permissionOverrides?.allow?.includes(permission as never)} disabled={ownerOnly} /> {label}{ownerOnly ? " (فقط مالک)" : ""}</label>; })}</fieldset><fieldset><legend className="font-bold">منع صریح</legend>{Object.entries(permissionLabels).map(([permission, label]) => { const ownerOnly = permission === "users" || permission === "security"; return <label key={permission} className={`block ${ownerOnly ? "text-ink-400" : ""}`}><input type="checkbox" name="permissionDeny" value={permission} defaultChecked={!ownerOnly && u.permissionOverrides?.deny?.includes(permission as never)} disabled={ownerOnly} /> {label}{ownerOnly ? " (فقط مالک)" : ""}</label>; })}</fieldset></div></details>
                  <label className="flex items-center gap-2 text-xs font-bold text-madder-700"><input type="checkbox" name="disabled" defaultChecked={u.disabled} /> حساب غیرفعال باشد</label>
                  <Input name="disabledReason" defaultValue={u.disabledReason} placeholder="دلیل غیرفعال‌سازی" />
                  <button type="submit" className="h-9 cursor-pointer rounded-lg bg-navy-800 px-3 text-[13px] font-bold whitespace-nowrap text-white">
                    ثبت
                  </button>
                </form>
            </Td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}
