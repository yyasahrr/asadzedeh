import Link from "next/link";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input } from "@/components/ui/Input";
import { ALL_PERMISSIONS, getSessionUser, isSuperAdmin, permissionLabels } from "@/lib/auth";
import { getSettings, getUsers } from "@/lib/store";
import { deleteAccessProfile, saveAccessProfile } from "../../actions";

const builtIns = new Set(["manager", "content", "support", "instructor"]);

function PermissionGrid({ selected }: { selected?: string[] }) {
  return <div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ALL_PERMISSIONS.map((permission) => { const ownerOnly = permission === "users" || permission === "security"; return <label key={permission} className={`flex min-h-10 items-center gap-2 rounded-lg border border-ink-900/10 px-3 text-sm ${ownerOnly ? "cursor-not-allowed bg-ink-50 text-ink-400" : "hover:bg-sand-50"}`}><input type="checkbox" name="permissions" value={permission} defaultChecked={!ownerOnly && selected?.includes(permission)} disabled={ownerOnly} /><span>{permissionLabels[permission]}{ownerOnly ? " (فقط مالک)" : ""}</span></label>; })}</div><p className="mt-2 text-xs text-ink-500">مدیریت کاربران و امنیت پنل همیشه در اختیار مالک اصلی می‌ماند.</p></div>;
}

export default async function AccessProfilesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await getSessionUser();
  if (!isSuperAdmin(user)) return <Denied />;
  const query = await searchParams;
  const profiles = getSettings().accessProfiles ?? [];
  const usage = new Map(profiles.map((profile) => [profile.id, getUsers().filter((item) => item.accessProfileId === profile.id).length]));
  const errors: Record<string, string> = { builtin: "پروفایل‌های پایه قابل حذف نیستند.", inuse: "این پروفایل هنوز به کاربر متصل است.", name: "نام پروفایل الزامی است.", notfound: "پروفایل پیدا نشد." };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold text-ink-500">کاربران و دسترسی</p><h1 className="text-2xl font-black text-navy-900">پروفایل‌های دسترسی</h1></div><Link href="/admin/users" className="text-sm font-bold text-teal-700 hover:underline">بازگشت به کاربران</Link></div>
    {query.error && <p className="rounded-lg bg-madder-50 p-3 text-sm font-bold text-madder-700">{errors[query.error] ?? "عملیات انجام نشد."}</p>}
    {query.saved && <p className="rounded-lg bg-teal-50 p-3 text-sm font-bold text-teal-700">پروفایل ذخیره شد.</p>}
    <details className="rounded-xl border border-ink-900/10 bg-card p-4"><summary className="cursor-pointer font-black text-navy-900">ساخت پروفایل جدید</summary><form action={saveAccessProfile} className="mt-4 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><FieldLabel htmlFor="profile-new-name">نام</FieldLabel><Input id="profile-new-name" name="name" required /></div><div><FieldLabel htmlFor="profile-new-description">توضیح</FieldLabel><Input id="profile-new-description" name="description" /></div></div><PermissionGrid /><button className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700">ساخت پروفایل</button></form></details>
    <div className="space-y-3">{profiles.map((profile) => <details key={profile.id} className="rounded-xl border border-ink-900/10 bg-card p-4"><summary className="cursor-pointer"><strong className="text-navy-900">{profile.name}</strong><span className="ms-2 text-xs text-ink-500">{usage.get(profile.id) ?? 0} کاربر • {profile.permissions.length} مجوز {builtIns.has(profile.id) ? "• پایه" : ""}</span></summary><form action={saveAccessProfile} className="mt-4 space-y-4"><input type="hidden" name="id" value={profile.id} /><div className="grid gap-4 sm:grid-cols-2"><div><FieldLabel htmlFor={`name-${profile.id}`}>نام</FieldLabel><Input id={`name-${profile.id}`} name="name" defaultValue={profile.name} required /></div><div><FieldLabel htmlFor={`desc-${profile.id}`}>توضیح</FieldLabel><Input id={`desc-${profile.id}`} name="description" defaultValue={profile.description} /></div></div><PermissionGrid selected={profile.permissions} /><div className="flex flex-wrap gap-2"><button className="rounded-lg bg-navy-800 px-5 py-2 text-sm font-bold text-white hover:bg-navy-700">ذخیره تغییرات</button>{!builtIns.has(profile.id) && (usage.get(profile.id) ?? 0) === 0 ? <button formAction={deleteAccessProfile} className="rounded-lg border border-madder-700/30 px-4 py-2 text-sm font-bold text-madder-700 hover:bg-madder-50">حذف پروفایل</button> : null}</div></form></details>)}</div>
  </div>;
}
