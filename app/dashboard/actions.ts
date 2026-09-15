"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { getCourse, getEnrollments, getUsers, syncCollections, writeDb } from "@/lib/store";
import { insertCertificateIfAbsent } from "@/lib/db/commerce";
import { audit } from "@/lib/audit";
import { generateCertificateCode } from "@/lib/certificate-code";
import { faToday } from "@/lib/format";

/** Mark a lesson as completed / not completed and remember the last watched lesson. */
export async function setLessonProgress(courseSlug: string, lessonId: string, completed: boolean) {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const enrollments = getEnrollments();
  const idx = enrollments.findIndex((e) => e.userId === user.id && e.courseSlug === courseSlug);
  if (idx < 0) return { ok: false, error: "not-enrolled" };

  const course = getCourse(courseSlug);
  // The lesson must actually belong to the course the learner is enrolled in.
  // Without this, a caller could stuff arbitrary ids into `completed` and use
  // them to satisfy the completion rule for a different course's lessons.
  const known = new Set((course?.lessons ?? []).map((l) => l.id));
  if (!course || !known.has(lessonId)) {
    await audit({
      action: "progress.rejected",
      level: "warn",
      actor: { id: user.id, name: user.name, role: user.role },
      target: `course:${courseSlug}`,
      detail: { reason: "unknown lesson", lessonId: lessonId.slice(0, 80) },
    });
    return { ok: false, error: "unknown-lesson" };
  }

  const e = enrollments[idx];
  const set = new Set(e.completed);
  if (completed) set.add(lessonId);
  else set.delete(lessonId);
  enrollments[idx] = { ...e, completed: Array.from(set), lastLessonId: lessonId };
  const required = (course?.lessons ?? []).filter((l) => !l.free);
  const requiredIds = required.length > 0 ? required.map((l) => l.id) : (course?.lessons ?? []).map((l) => l.id);
  const done = requiredIds.length > 0 && requiredIds.every((id) => set.has(id));
  if (done && course && user) {
    // Two tabs finishing the last lesson at once must not produce two
    // certificates. The insert is `ON CONFLICT DO NOTHING` against a partial
    // unique index, so the loser is a clean no-op.
    let code = generateCertificateCode();
    let issued = false;
    for (let attempt = 0; attempt < 5 && !issued; attempt += 1) {
      issued = await insertCertificateIfAbsent({
        code,
        userId: user.id,
        student: user.name,
        course: course.title,
        instructorName: course.instructor,
        hours: course.hours,
        issuedAt: new Date().toISOString(),
        payload: {
          code,
          student: user.name,
          course: course.title,
          date: faToday(),
          hours: course.hours,
          instructorName: course.instructor,
          userId: user.id,
        },
      });
      if (!issued) code = generateCertificateCode();
    }
    await syncCollections(["certificates"]);
    if (issued) {
      await audit({ action: "certificate.issue", actor: { id: user.id, name: user.name, role: user.role }, target: `certificate:${code}`, detail: { via: "progress", course: course.slug } });
    }
    writeDb({ enrollments });
  } else {
    writeDb({ enrollments });
  }
  revalidatePath(`/dashboard/courses/${courseSlug}`);
  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/certificates");
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

/** Student profile: name / email / province / city / age / gender / bio (phone is the login id and cannot be changed here). */
export async function updateProfile(fd: FormData) {
  const me = await getSessionUser();
  if (!me) redirect("/auth?next=/dashboard/profile");
  const name = clean(fd, "name", 80);
  const email = clean(fd, "email", 120);
  const province = clean(fd, "province", 60);
  const city = clean(fd, "city", 60);
  const ageStr = clean(fd, "age", 4);
  const gender = clean(fd, "gender", 10) as "male" | "female" | "other" | "";
  const bio = clean(fd, "bio", 400);
  if (name.length < 2) redirect("/dashboard/profile?error=name");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/dashboard/profile?error=email");
  const age = ageStr ? Number(ageStr) : undefined;
  writeDb({
    users: getUsers().map((u) => (u.id === me.id ? {
      ...u,
      name,
      email: email || undefined,
      province: province || undefined,
      city: city || undefined,
      age: age && age >= 10 && age <= 100 ? age : undefined,
      gender: gender || undefined,
      bio: bio || undefined,
    } : u)),
  });
  await audit({ action: "profile.update", actor: { id: me.id, name, role: me.role }, target: `user:${me.id}` });
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/profile?saved=1");
}

export async function changePassword(fd: FormData) {
  const me = await getSessionUser();
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
