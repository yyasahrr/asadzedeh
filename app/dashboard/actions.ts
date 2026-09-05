"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSessionUser as getMe, hashPassword, verifyPassword } from "@/lib/auth";
import { getEnrollments, getUsers, writeDb } from "@/lib/store";
import { audit } from "@/lib/audit";

/** Mark a lesson as completed / not completed and remember the last watched lesson. */
export async function setLessonProgress(courseSlug: string, lessonId: string, completed: boolean) {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  const enrollments = getEnrollments();
  const idx = enrollments.findIndex((e) => e.userId === user.id && e.courseSlug === courseSlug);
  if (idx < 0) return { ok: false };
  const e = enrollments[idx];
  const set = new Set(e.completed);
  if (completed) set.add(lessonId);
  else set.delete(lessonId);
  enrollments[idx] = { ...e, completed: Array.from(set), lastLessonId: lessonId };
  writeDb({ enrollments });
  revalidatePath(`/dashboard/courses/${courseSlug}`);
  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard");
  return { ok: true, completed: enrollments[idx].completed.length };
}

export async function touchLesson(courseSlug: string, lessonId: string) {
  const user = await getSessionUser();
  if (!user) return;
  const enrollments = getEnrollments();
  const idx = enrollments.findIndex((e) => e.userId === user.id && e.courseSlug === courseSlug);
  if (idx < 0 || enrollments[idx].lastLessonId === lessonId) return;
  enrollments[idx] = { ...enrollments[idx], lastLessonId: lessonId };
  writeDb({ enrollments });
}


const clean = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? "").trim().slice(0, max);

/** Student profile: name / email / city / bio (phone is the login id and cannot be changed here). */
export async function updateProfile(fd: FormData) {
  const me = await getMe();
  if (!me) redirect("/auth?next=/dashboard/profile");
  const name = clean(fd, "name", 80);
  const email = clean(fd, "email", 120);
  const city = clean(fd, "city", 60);
  const bio = clean(fd, "bio", 400);
  if (name.length < 2) redirect("/dashboard/profile?error=name");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/dashboard/profile?error=email");
  writeDb({
    users: getUsers().map((u) => (u.id === me.id ? { ...u, name, email: email || undefined, city: city || undefined, bio: bio || undefined } : u)),
  });
  await audit({ action: "profile.update", actor: { id: me.id, name, role: me.role }, target: `user:${me.id}` });
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/profile?saved=1");
}

export async function changePassword(fd: FormData) {
  const me = await getMe();
  if (!me) redirect("/auth?next=/dashboard/profile");
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const full = getUsers().find((u) => u.id === me.id);
  if (!full || !verifyPassword(current, full.passwordHash)) redirect("/dashboard/profile?error=current");
  if (next.length < 6) redirect("/dashboard/profile?error=weak");
  if (next !== confirm) redirect("/dashboard/profile?error=confirm");
  writeDb({ users: getUsers().map((u) => (u.id === me.id ? { ...u, passwordHash: hashPassword(next) } : u)) });
  await audit({ action: "auth.password.change", level: "security", actor: { id: me.id, name: me.name, role: me.role }, target: `user:${me.id}` });
  redirect("/dashboard/profile?saved=pass");
}
