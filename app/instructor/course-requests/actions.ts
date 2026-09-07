"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import { getCourseRequest, getCourseRequests, getInstructorByUser, writeDb } from "@/lib/store";
import type { CourseRequest, CourseRequestChapter, CourseRequestLesson, Level } from "@/lib/types";

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
function lines(value: string): string[] {
  return value.split("\n").map((l) => l.trim()).filter(Boolean);
}

async function me(): Promise<{ user: SessionUser; instId: string }> {
  const user = await getSessionUser();
  const inst = user ? getInstructorByUser(user.id) : undefined;
  if (!user || !inst) redirect("/auth?next=/instructor/course-requests");
  return { user, instId: inst.slug };
}

const actor = (u: SessionUser) => ({ id: u.id, name: u.name, role: u.role });

export async function createCourseRequest(fd: FormData) {
  const { user, instId } = await me();
  const inst = getInstructorByUser(user.id)!;

  const title = str(fd, "title");
  if (!title) return;

  const now = new Date().toISOString();
  const syllabus = lines(str(fd, "syllabus")).map((line) => {
    const [t, rest] = line.split(":");
    return {
      title: (t ?? line).trim(),
      lessons: rest ? rest.split(/[؛;]/).map((l) => l.trim()).filter(Boolean) : [],
    };
  });

  const request: CourseRequest = {
    id: `cr-${Date.now().toString(36)}`,
    title,
    shortTitle: str(fd, "shortTitle") || title,
    category: str(fd, "category") || "فرش‌بافی",
    instructorSlug: instId,
    instructorName: inst.name,
    instructorUserId: user.id,
    level: (str(fd, "level") || "مقدماتی") as Level,
    sessions: num(fd, "sessions", 10),
    hours: num(fd, "hours", 10),
    price: num(fd, "price", 0),
    oldPrice: num(fd, "oldPrice") ? num(fd, "oldPrice") : undefined,
    image: str(fd, "image") || "/images/course-carpet.jpg",
    excerpt: str(fd, "excerpt"),
    outcomes: lines(str(fd, "outcomes")),
    syllabus: syllabus.length > 0 ? syllabus : [{ title: "معرفی دوره", lessons: ["آشنایی با دوره"] }],
    badge: str(fd, "badge") || "جدید",
    chapters: [],
    lessons: [],
    faq: [],
    status: "در انتظار بررسی",
    createdAt: now,
    updatedAt: now,
  };

  writeDb({ courseRequests: [request, ...getCourseRequests()] });

  await audit({ action: "courseRequest.create", actor: actor(user), target: `courseRequest:${request.id}`, detail: { title, status: request.status } });
  revalidatePath("/instructor/course-requests");
  redirect("/instructor/course-requests?created=1");
}

export async function updateCourseRequest(fd: FormData) {
  const { user, instId } = await me();
  const inst = getInstructorByUser(user.id)!;
  const id = str(fd, "id");
  const request = getCourseRequest(id);

  if (!request || request.instructorUserId !== user.id) return;
  if (request.status !== "پیش‌نویس" && request.status !== "رد شده") {
    return;
  }

  const title = str(fd, "title");
  if (!title) return;

  const now = new Date().toISOString();
  const syllabus = lines(str(fd, "syllabus")).map((line) => {
    const [t, rest] = line.split(":");
    return {
      title: (t ?? line).trim(),
      lessons: rest ? rest.split(/[؛;]/).map((l) => l.trim()).filter(Boolean) : [],
    };
  });

  const updated: CourseRequest = {
    ...request,
    title,
    shortTitle: str(fd, "shortTitle") || title,
    category: str(fd, "category") || request.category,
    instructorSlug: instId,
    instructorName: inst.name,
    level: (str(fd, "level") || request.level) as Level,
    sessions: num(fd, "sessions", request.sessions),
    hours: num(fd, "hours", request.hours),
    price: num(fd, "price", request.price),
    oldPrice: num(fd, "oldPrice") ? num(fd, "oldPrice") : undefined,
    image: str(fd, "image") || request.image,
    excerpt: str(fd, "excerpt") || request.excerpt,
    outcomes: lines(str(fd, "outcomes")).length > 0 ? lines(str(fd, "outcomes")) : request.outcomes,
    syllabus: syllabus.length > 0 ? syllabus : request.syllabus,
    badge: str(fd, "badge") || request.badge,
    updatedAt: now,
  };

  const allRequests = getCourseRequests();
  writeDb({
    courseRequests: [...allRequests.filter((r) => r.id !== id), updated],
  });

  await audit({ action: "courseRequest.update", actor: actor(user), target: `courseRequest:${id}` });
  revalidatePath("/instructor/course-requests");
  revalidatePath(`/instructor/course-requests/${id}`);
}

export async function submitCourseRequest(fd: FormData) {
  const { user } = await me();
  const id = str(fd, "id");
  const request = getCourseRequest(id);

  if (!request || request.instructorUserId !== user.id) return;
  if (request.status !== "پیش‌نویس" && request.status !== "رد شده") return;

  const now = new Date().toISOString();
  const updated: CourseRequest = {
    ...request,
    status: "در انتظار بررسی",
    rejectionReason: undefined,
    updatedAt: now,
  };

  const allRequests = getCourseRequests();
  writeDb({
    courseRequests: [...allRequests.filter((r) => r.id !== id), updated],
  });

  await audit({ action: "courseRequest.submit", actor: actor(user), target: `courseRequest:${id}`, detail: { status: "در انتظار بررسی" } });
  revalidatePath("/instructor/course-requests");
  revalidatePath(`/instructor/course-requests/${id}`);
}

export async function deleteCourseRequest(fd: FormData) {
  const { user } = await me();
  const id = str(fd, "id");
  const request = getCourseRequest(id);

  if (!request || request.instructorUserId !== user.id) return;
  if (request.status === "تأیید شده") return;

  writeDb({
    courseRequests: getCourseRequests().filter((r) => r.id !== id),
  });

  await audit({ action: "courseRequest.delete", level: "warn", actor: actor(user), target: `courseRequest:${id}` });
  revalidatePath("/instructor/course-requests");
}

export async function addChapter(fd: FormData) {
  const { user } = await me();
  const id = str(fd, "id");
  const title = str(fd, "title");
  const request = getCourseRequest(id);

  if (!request || request.instructorUserId !== user.id) return;
  if (request.status !== "پیش‌نویس") return;

  const chapters = request.chapters ?? [];
  const chapter: CourseRequestChapter = {
    id: `ch-${Date.now().toString(36)}`,
    title,
    order: chapters.length + 1,
  };

  const updated: CourseRequest = {
    ...request,
    chapters: [...chapters, chapter],
    updatedAt: new Date().toISOString(),
  };

  writeDb({
    courseRequests: [...getCourseRequests().filter((r) => r.id !== id), updated],
  });

  await audit({ action: "courseRequest.chapter.add", actor: actor(user), target: `courseRequest:${id}`, detail: { chapter: chapter.title } });
  revalidatePath(`/instructor/course-requests/${id}`);
}

export async function addLesson(fd: FormData) {
  const { user } = await me();
  const id = str(fd, "id");
  const title = str(fd, "title");
  const request = getCourseRequest(id);

  if (!request || request.instructorUserId !== user.id) return;
  if (request.status !== "پیش‌نویس") return;

  const lessons = request.lessons ?? [];
  const chapterId = str(fd, "chapterId") || request.chapters?.[0]?.id || "";
  const lesson: CourseRequestLesson = {
    id: `l-${Date.now().toString(36)}`,
    title,
    chapterId,
    order: lessons.length + 1,
    durationMin: num(fd, "durationMin", 10),
    free: bool(fd, "free"),
    description: str(fd, "description") || undefined,
  };

  const updated: CourseRequest = {
    ...request,
    lessons: [...lessons, lesson],
    updatedAt: new Date().toISOString(),
  };

  writeDb({
    courseRequests: [...getCourseRequests().filter((r) => r.id !== id), updated],
  });

  await audit({ action: "courseRequest.lesson.add", actor: actor(user), target: `courseRequest:${id}`, detail: { lesson: lesson.title } });
  revalidatePath(`/instructor/course-requests/${id}`);
}

export async function updateLesson(fd: FormData) {
  const { user } = await me();
  const id = str(fd, "id");
  const lessonId = str(fd, "lessonId");
  const request = getCourseRequest(id);

  if (!request || request.instructorUserId !== user.id) return;
  if (request.status !== "پیش‌نویس") return;

  const lessons = (request.lessons ?? []).map((l) =>
    l.id === lessonId
      ? {
          ...l,
          title: str(fd, "title") || l.title,
          chapterId: str(fd, "chapterId") || l.chapterId,
          durationMin: num(fd, "durationMin", l.durationMin),
          free: bool(fd, "free"),
          description: str(fd, "description") || l.description,
        }
      : l
  );

  const updated: CourseRequest = {
    ...request,
    lessons,
    updatedAt: new Date().toISOString(),
  };

  writeDb({
    courseRequests: [...getCourseRequests().filter((r) => r.id !== id), updated],
  });

  await audit({ action: "courseRequest.lesson.update", actor: actor(user), target: `courseRequest:${id}`, detail: { lessonId } });
  revalidatePath(`/instructor/course-requests/${id}`);
}

export async function deleteLesson(fd: FormData) {
  const { user } = await me();
  const id = str(fd, "id");
  const lessonId = str(fd, "lessonId");
  const request = getCourseRequest(id);

  if (!request || request.instructorUserId !== user.id) return;
  if (request.status !== "پیش‌نویس") return;

  const lessons = (request.lessons ?? []).filter((l) => l.id !== lessonId).map((l, i) => ({ ...l, order: i + 1 }));

  const updated: CourseRequest = {
    ...request,
    lessons,
    updatedAt: new Date().toISOString(),
  };

  writeDb({
    courseRequests: [...getCourseRequests().filter((r) => r.id !== id), updated],
  });

  await audit({ action: "courseRequest.lesson.delete", level: "warn", actor: actor(user), target: `courseRequest:${id}`, detail: { lessonId } });
  revalidatePath(`/instructor/course-requests/${id}`);
}
