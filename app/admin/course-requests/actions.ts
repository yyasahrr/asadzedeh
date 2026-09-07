"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { can, getSessionUser, type SessionUser } from "@/lib/auth";
import { getCourseRequest, getCourseRequests, getCourses, writeDb } from "@/lib/store";
import type { OnlineCourse } from "@/lib/types";

function actor(u: SessionUser) {
  return { id: u.id, name: u.name, role: u.role };
}

export async function approveCourseRequest(id: string) {
  const user = await getSessionUser();
  if (!user || !can(user, "courses")) return;

  const request = getCourseRequest(id);
  if (!request || request.status !== "در انتظار بررسی") return;

  const now = new Date().toISOString();
  const chapters = request.chapters?.map((ch) => ({
    id: ch.id,
    title: ch.title,
    order: ch.order,
  })) ?? [];

  const lessons = request.lessons?.map((l) => ({
    id: l.id,
    title: l.title,
    chapterId: l.chapterId,
    order: l.order,
    durationMin: l.durationMin,
    free: l.free,
    description: l.description,
  })) ?? [];

  const newCourse: OnlineCourse = {
    slug: `c-${Date.now().toString(36)}`,
    title: request.title,
    shortTitle: request.shortTitle,
    category: request.category,
    instructor: request.instructorName,
    instructorRole: `مدرس ${request.category}`,
    instructorSlug: request.instructorSlug,
    level: request.level,
    sessions: request.sessions,
    hours: request.hours,
    price: request.price,
    oldPrice: request.oldPrice,
    rating: 5,
    students: 0,
    image: request.image,
    excerpt: request.excerpt,
    outcomes: request.outcomes,
    syllabus: request.syllabus,
    badge: request.badge,
    trailer: request.trailer,
    chapters,
    lessons,
    faq: request.faq,
  };

  const courses = getCourses();
  courses.unshift(newCourse);

  writeDb({
    courses,
    courseRequests: getCourseRequests().map((r) =>
      r.id === id
        ? {
            ...r,
            status: "تأیید شده" as const,
            reviewedBy: user.name,
            reviewedAt: now,
          }
        : r
    ),
  });

  await audit({ action: "courseRequest.approve", actor: actor(user), target: `courseRequest:${id}`, detail: { title: request.title, slug: newCourse.slug } });

  revalidatePath("/admin/course-requests");
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath("/instructor/course-requests");

  redirect(`/admin/course-requests/${id}?approved=1`);
}

export async function rejectCourseRequest(fd: FormData) {
  const user = await getSessionUser();
  if (!user || !can(user, "courses")) return;

  const id = String(fd.get("id") ?? "").trim();
  const reason = String(fd.get("reason") ?? "").trim();

  const request = getCourseRequest(id);
  if (!request || request.status !== "در انتظار بررسی") return;

  const now = new Date().toISOString();

  writeDb({
    courseRequests: getCourseRequests().map((r) =>
      r.id === id
        ? {
            ...r,
            status: "رد شده" as const,
            rejectionReason: reason || undefined,
            reviewedBy: user.name,
            reviewedAt: now,
          }
        : r
    ),
  });

  await audit({ action: "courseRequest.reject", actor: actor(user), target: `courseRequest:${id}`, detail: { reason } });

  revalidatePath("/admin/course-requests");
  revalidatePath(`/admin/course-requests/${id}`);
  revalidatePath("/instructor/course-requests");
}

export async function deleteCourseRequest(id: string) {
  const user = await getSessionUser();
  if (!user || !can(user, "courses")) return;

  writeDb({
    courseRequests: getCourseRequests().filter((r) => r.id !== id),
  });

  await audit({ action: "courseRequest.delete", level: "warn", actor: actor(user), target: `courseRequest:${id}` });

  revalidatePath("/admin/course-requests");
  redirect("/admin/course-requests");
}
