"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import { getCourses, getCourse, getInstructorByUser, getInstructors, getSubmissions, writeDb } from "@/lib/store";
import type { Instructor, Lesson } from "@/lib/types";

/* Instructor panel actions: every write is scoped to the instructor's own courses. */

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function num(fd: FormData, key: string, fallback = 0): number {
  const n = Number(str(fd, key).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === "on" || fd.get(key) === "1" || fd.get(key) === "true";
}

async function me(): Promise<{ user: SessionUser; inst: Instructor }> {
  const user = await getSessionUser();
  const inst = user ? getInstructorByUser(user.id) : undefined;
  if (!user || !inst) redirect("/auth?next=/instructor");
  return { user, inst };
}

function ownCourse(slug: string, inst: Instructor) {
  const course = getCourse(slug);
  if (!course || course.instructorSlug !== inst.slug) return null;
  return course;
}

const actor = (u: SessionUser) => ({ id: u.id, name: u.name, role: u.role });

function refresh(slug: string) {
  revalidatePath(`/instructor/courses/${slug}`);
  revalidatePath(`/courses/${slug}`);
  revalidatePath(`/dashboard/courses/${slug}`);
}

export async function instructorAddLesson(fd: FormData) {
  const { user, inst } = await me();
  const slug = str(fd, "slug");
  const course = ownCourse(slug, inst);
  const title = str(fd, "title");
  if (!course || !title) return;
  const lessons = course.lessons ?? [];
  const lesson: Lesson = {
    id: `l-${Date.now().toString(36)}`,
    title,
    chapter: str(fd, "chapter") || course.syllabus[0]?.title || "فصل ۱",
    order: lessons.length + 1,
    videoId: str(fd, "videoId") || undefined,
    durationMin: num(fd, "durationMin", 10),
    free: bool(fd, "free"),
    description: str(fd, "description") || undefined,
  };
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, lessons: [...lessons, lesson] } : c)) });
  await audit({ action: "course.lesson.add", actor: actor(user), target: `course:${slug}`, detail: { lesson: title, byInstructor: inst.slug } });
  refresh(slug);
  redirect(`/instructor/courses/${slug}`);
}

export async function instructorUpdateLesson(fd: FormData) {
  const { user, inst } = await me();
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const course = ownCourse(slug, inst);
  if (!course) return;
  const lessons = (course.lessons ?? []).map((l) =>
    l.id === id
      ? {
          ...l,
          title: str(fd, "title") || l.title,
          chapter: str(fd, "chapter") || l.chapter,
          order: num(fd, "order", l.order),
          videoId: str(fd, "videoId") || undefined,
          durationMin: num(fd, "durationMin", l.durationMin),
          free: bool(fd, "free"),
          description: str(fd, "description") || undefined,
        }
      : l
  );
  lessons.sort((a, b) => a.order - b.order).forEach((l, i) => (l.order = i + 1));
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, lessons } : c)) });
  await audit({ action: "course.lesson.update", actor: actor(user), target: `course:${slug}`, detail: { lesson: id, byInstructor: inst.slug } });
  refresh(slug);
  redirect(`/instructor/courses/${slug}`);
}

export async function instructorDeleteLesson(fd: FormData) {
  const { user, inst } = await me();
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const course = ownCourse(slug, inst);
  if (!course) return;
  const lessons = (course.lessons ?? []).filter((l) => l.id !== id).map((l, i) => ({ ...l, order: i + 1 }));
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, lessons } : c)) });
  await audit({ action: "course.lesson.delete", level: "warn", actor: actor(user), target: `course:${slug}`, detail: { lesson: id, byInstructor: inst.slug } });
  refresh(slug);
}

export async function instructorMoveLesson(fd: FormData) {
  const { inst } = await me();
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const course = ownCourse(slug, inst);
  if (!course) return;
  const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
  const idx = lessons.findIndex((l) => l.id === id);
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= lessons.length) return;
  [lessons[idx], lessons[j]] = [lessons[j], lessons[idx]];
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, lessons: lessons.map((l, i) => ({ ...l, order: i + 1 })) } : c)) });
  refresh(slug);
}

/** Instructors can edit the marketing text of their own courses (not price/protection). */
export async function instructorUpdateCourseText(fd: FormData) {
  const { user, inst } = await me();
  const slug = str(fd, "slug");
  const course = ownCourse(slug, inst);
  if (!course) return;
  const outcomes = str(fd, "outcomes").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  writeDb({
    courses: getCourses().map((c) =>
      c.slug === slug ? { ...c, excerpt: str(fd, "excerpt") || c.excerpt, outcomes: outcomes.length ? outcomes : c.outcomes } : c
    ),
  });
  await audit({ action: "course.update", actor: actor(user), target: `course:${slug}`, detail: { byInstructor: inst.slug, fields: ["excerpt", "outcomes"] } });
  refresh(slug);
  redirect(`/instructor/courses/${slug}?saved=1`);
}

/** Review a student's submission for one of the instructor's courses. */
export async function instructorReviewSubmission(fd: FormData) {
  const { user, inst } = await me();
  const id = str(fd, "id");
  const status = str(fd, "status") as "تأیید شده" | "نیاز به اصلاح" | "در حال بررسی";
  const note = str(fd, "note");
  const mine = new Set(getCourses().filter((c) => c.instructorSlug === inst.slug).flatMap((c) => [c.title, c.shortTitle]));
  const sub = getSubmissions().find((s) => s.id === id);
  if (!sub || !mine.has(sub.course)) return;
  writeDb({ submissions: getSubmissions().map((s) => (s.id === id ? { ...s, status, note: note || s.note } : s)) });
  await audit({ action: "content.update", actor: actor(user), target: `submission:${id}`, detail: { status, byInstructor: inst.slug } });
  revalidatePath("/instructor/students");
  revalidatePath("/dashboard/assignments");
}

/** Instructors may edit their own public profile. */
export async function instructorUpdateProfile(fd: FormData) {
  const { user, inst } = await me();
  const about = str(fd, "about").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  writeDb({
    instructors: getInstructors().map((i) =>
      i.slug === inst.slug
        ? {
            ...i,
            specialty: str(fd, "specialty") || i.specialty,
            experience: str(fd, "experience") || i.experience,
            bio: str(fd, "bio") || i.bio,
            about: about.length ? about : i.about,
            email: str(fd, "email") || i.email,
            instagram: str(fd, "instagram") || i.instagram,
            image: str(fd, "image") || i.image,
          }
        : i
    ),
  });
  await audit({ action: "instructor.update", actor: actor(user), target: `instructor:${inst.slug}`, detail: { self: true } });
  revalidatePath("/instructors");
  revalidatePath("/instructor/profile");
  redirect("/instructor/profile?saved=1");
}
