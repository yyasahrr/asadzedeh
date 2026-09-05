import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getUsers } from "@/lib/store";
import { getSessionUser, can, roleLabels } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { TableShell, Td } from "@/components/admin/TableShell";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import { addStaff, updateUserRole } from "../actions";

export const metadata: Metadata = { title: "کاربران و دسترسی" };

const staffRoles: Role[] = ["manager", "editor", "support"];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user?.role !== "admin") return <Denied />;
  const { error } = await searchParams;
  const users = getUsers();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">کاربران و سطوح دسترسی</h1>
      {error === "dup" && (
        <p className="rounded-2xl bg-madder-50 px-5 py-3.5 text-sm font-bold text-madder-700 ring-1 ring-madder-700/25 ring-inset">
          این شماره موبایل قبلاً ثبت شده است.
        </p>
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
            <FieldLabel htmlFor="u-phone">موبایل *</FieldLabel>
            <Input id="u-phone" name="phone" required inputMode="tel" dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="u-pass">رمز عبور * (حداقل ۶ رقم)</FieldLabel>
            <Input id="u-pass" name="password" type="password" required dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="u-role">نقش</FieldLabel>
            <Select id="u-role" name="role" defaultValue="editor">
              {staffRoles.map((r) => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </Select>
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
              {u.name} {u.id === user.id && <span className="text-xs text-ink-400">(شما)</span>}
            </Td>
            <Td><span dir="ltr" className="text-ink-600">{u.phone}</span></Td>
            <Td><span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ink-700">{roleLabels[u.role]}</span></Td>
            <Td className="whitespace-nowrap text-ink-600">{u.createdAt}</Td>
            <Td>
              {u.id === user.id ? (
                <span className="text-xs text-ink-400">—</span>
              ) : (
                <form action={updateUserRole} className="flex items-center gap-1.5">
                  <input type="hidden" name="id" value={u.id} />
                  <label htmlFor={`rl-${u.id}`} className="sr-only">نقش {u.name}</label>
                  <select
                    id={`rl-${u.id}`}
                    name="role"
                    defaultValue={u.role}
                    className="h-9 cursor-pointer rounded-lg border border-ink-900/10 bg-white px-2 text-[13px] font-bold focus:border-teal-600 focus:outline-none"
                  >
                    {(["manager", "editor", "support", "student"] as Role[]).map((r) => (
                      <option key={r} value={r}>{roleLabels[r]}</option>
                    ))}
                  </select>
                  <button type="submit" className="h-9 cursor-pointer rounded-lg bg-navy-800 px-3 text-[13px] font-bold whitespace-nowrap text-white">
                    ثبت
                  </button>
                </form>
              )}
            </Td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}
