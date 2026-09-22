"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser, isSuperAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { deleteRegisteredStudent, revokeStudentSessions, updateStudentAccount } from "@/lib/admin-student-accounts";

async function owner() {
  const user = await getSessionUser();
  if (!user) redirect("/admin");
  if (!isSuperAdmin(user)) redirect("/admin");
  return user;
}
function value(fd: FormData, key: string): string { return String(fd.get(key) ?? "").trim(); }
function actor(user: Awaited<ReturnType<typeof owner>>) { const { id, name, role } = user; return { id, name, role }; }

export async function updateStudentAccountAction(fd: FormData) {
  const me = await owner(); const id = value(fd, "id"); const beforePhone = value(fd, "previousPhone");
  try {
    const { phoneChanged } = await updateStudentAccount({ id, name: value(fd, "name"), phone: value(fd, "phone"), email: value(fd, "email"), enabled: fd.get("enabled") === "on" });
    await audit({ action: "user.profile.updated", level: "security", actor: actor(me), target: `user:${id}`, detail: { fields: ["name", "email", "enabled", ...(phoneChanged ? ["phone"] : [])] } });
    if (phoneChanged) await audit({ action: "user.phone.changed_by_admin", level: "security", actor: actor(me), target: `user:${id}`, detail: { oldPhone: mask(beforePhone), newPhone: mask(value(fd, "phone")), verificationMethod: "admin_override" } });
    await audit({ action: fd.get("enabled") === "on" ? "user.enabled" : "user.disabled", level: "security", actor: actor(me), target: `user:${id}` });
  } catch (error) { redirect(`/admin/students/${encodeURIComponent(id)}?error=${encodeURIComponent(error instanceof Error ? error.message : "update-failed")}`); }
  revalidatePath(`/admin/students/${id}`); revalidatePath("/admin/students"); redirect(`/admin/students/${id}?saved=profile`);
}

export async function revokeStudentSessionsAction(fd: FormData) { const me = await owner(); const id = value(fd, "id"); const count = await revokeStudentSessions(id); await audit({ action: "auth.sessions.revoked_by_admin", level: "security", actor: actor(me), target: `user:${id}`, detail: { count } }); revalidatePath(`/admin/students/${id}`); redirect(`/admin/students/${id}?saved=sessions`); }

export async function deleteRegisteredStudentAccount(fd: FormData) { const me = await owner(); const id = value(fd, "id"); if (id === me.id || value(fd, "confirmation") !== "حذف حساب") redirect(`/admin/students/${id}?error=confirmation`); let mode: "hard_deleted" | "anonymized"; try { mode = await deleteRegisteredStudent(id); } catch { redirect(`/admin/students/${id}?error=protected-account`); } await audit({ action: mode === "hard_deleted" ? "user.account.deleted" : "user.account.anonymized", level: "security", actor: actor(me), target: `user:${id}`, detail: { deletionMode: mode, reason: "admin_requested" } }); revalidatePath("/admin/students"); redirect(`/admin/students?deleted=${mode}`); }

function mask(phone: string): string { return /^09\d{9}$/.test(phone) ? `${phone.slice(0, 4)}***${phone.slice(-4)}` : "***"; }
