import type { SessionUser } from "./auth";
import { can } from "./auth";
import { audit } from "./audit";
import { createSpotLicense } from "./spotplayer";
import { faToday } from "./format";
import { getClasses, getCourses, getCourse, getEnrollment, getEnrollments, getInstructorByUser, getLearningPath, getOrders, getUserById, writeDb } from "./store";
import type { InPersonClass, Lesson, OnlineCourse, VideoAsset } from "./types";

/**
 * Who may watch which video?
 *  - staff with "videos"/"courses" permission: everything (preview in admin)
 *  - instructors: videos in their own courses
 *  - students: lessons of courses they are enrolled in, or free-preview lessons/trailers
 *  - anonymous: trailers and free lessons only
 */

export interface VideoContext {
  course?: OnlineCourse;
  inPersonClass?: InPersonClass;
  lesson?: Lesson;
  isTrailer: boolean;
}

/** Every place a video is used (a video may be a trailer in one course and a lesson in another). */
export function locateVideoAll(videoId: string): VideoContext[] {
  const out: VideoContext[] = [];
  for (const course of getCourses()) {
    if (course.trailer?.kind === "upload" && course.trailer.src === videoId) out.push({ course, isTrailer: true });
    for (const lesson of course.lessons ?? []) {
      if (lesson.videoId === videoId) out.push({ course, lesson, isTrailer: false });
    }
  }
  for (const inPersonClass of getClasses()) {
    if (inPersonClass.trailer?.kind === "upload" && inPersonClass.trailer.src === videoId) {
      out.push({ inPersonClass, isTrailer: true });
    }
    for (const lesson of inPersonClass.lessons ?? []) {
      if (lesson.videoId === videoId) out.push({ inPersonClass, lesson, isTrailer: false });
    }
  }
  return out;
}

/** Find where a video is used (first match). */
export function locateVideo(videoId: string): VideoContext {
  return locateVideoAll(videoId)[0] ?? { isTrailer: false };
}

/**
 * Resolve access across all usages: the first context that grants access wins
 * (so an enrolled student is never blocked because the same file is also used elsewhere).
 * Returns the most specific denial reason when nothing grants access.
 */
export function resolveAccess(user: SessionUser | null, video: VideoAsset): { ctx: VideoContext; access: ReturnType<typeof canWatch> } {
  const contexts = locateVideoAll(video.id);
  if (contexts.length === 0) {
    const ctx: VideoContext = { isTrailer: false };
    return { ctx, access: canWatch(user, video, ctx) };
  }
  let denied: { ctx: VideoContext; access: ReturnType<typeof canWatch> } | null = null;
  for (const ctx of contexts) {
    const access = canWatch(user, video, ctx);
    if (access.ok) return { ctx, access };
    if (!denied || ((ctx.course || ctx.inPersonClass) && !denied.ctx.course && !denied.ctx.inPersonClass)) {
      denied = { ctx, access };
    }
  }
  return denied!;
}

export function canWatch(user: SessionUser | null, video: VideoAsset, ctx: VideoContext): { ok: boolean; reason?: string; watermark: boolean } {
  // Staff preview
  if (user && (can(user, "videos") || can(user, "courses") || can(user, "classes"))) {
    return { ok: true, watermark: false };
  }

  // Instructor's own course
  if (user?.role === "instructor" && ctx.course) {
    const inst = getInstructorByUser(user.id);
    if (inst && ctx.course.instructorSlug === inst.slug) return { ok: true, watermark: false };
  }
  if (user?.role === "instructor" && ctx.inPersonClass) {
    const inst = getInstructorByUser(user.id);
    if (inst && ctx.inPersonClass.instructorSlug === inst.slug) return { ok: true, watermark: false };
  }

  // Public previews
  if (ctx.isTrailer) return { ok: true, watermark: false };
  if (ctx.lesson?.free) return { ok: true, watermark: !!user };

  // Enrolled student
  if (!user) return { ok: false, reason: "برای تماشای این جلسه وارد شوید", watermark: false };
  if (ctx.inPersonClass) {
    if (!hasPaidClassAccess(user, ctx.inPersonClass.slug)) {
      return { ok: false, reason: "برای این کلاس ثبت‌نام پرداخت‌شده ندارید", watermark: false };
    }
    return { ok: true, watermark: true };
  }
  if (!ctx.course) return { ok: false, reason: "این ویدیو به دوره‌ای متصل نیست", watermark: false };
  const enrollment = getEnrollment(user.id, ctx.course.slug);
  if (!enrollment) return { ok: false, reason: "این دوره را خریداری نکرده‌اید", watermark: false };
  return { ok: true, watermark: true };
}

export function hasPaidClassAccess(user: SessionUser | null, classSlug: string): boolean {
  if (!user) return false;
  if (can(user, "classes") || can(user, "courses")) return true;
  if (user.role === "instructor") {
    const inst = getInstructorByUser(user.id);
    const inPersonClass = getClasses().find((item) => item.slug === classSlug);
    if (inst && inPersonClass?.instructorSlug === inst.slug) return true;
  }
  return getOrders().some(
    (order) =>
      order.status === "پرداخت شده" &&
      (order.userId === user.id || order.phone === user.phone || order.student === user.name) &&
      (order.lines ?? []).some((line) => line.kind === "class" && line.slug === classSlug),
  );
}

export function isEnrolled(user: SessionUser | null, courseSlug: string): boolean {
  if (!user) return false;
  if (can(user, "courses")) return true;
  if (user.role === "instructor") {
    const inst = getInstructorByUser(user.id);
    const course = getCourses().find((c) => c.slug === courseSlug);
    if (inst && course?.instructorSlug === inst.slug) return true;
  }
  return !!getEnrollment(user.id, courseSlug);
}

/**
 * Internal service: Create enrollments (and SpotPlayer licenses) for the course lines of a paid order.
 * Also handles learning_path lines by enrolling in all courses within the path.
 * This is NOT a public server action — it must only be called after payment verification.
 * Idempotent: will not create duplicate enrollments.
 */
export async function grantAccessForOrder(orderId: string) {
  const order = getOrders().find((o) => o.id === orderId);
  if (!order?.userId || !order.lines) return;

  // Verify order is actually paid
  if (order.status !== "پرداخت شده") return;

  const user = getUserById(order.userId);
  if (!user) return;

  const enrollments = getEnrollments();
  const courseSlugsToEnroll: string[] = [];

  for (const line of order.lines) {
    if (line.kind === "course") {
      courseSlugsToEnroll.push(line.slug);
    } else if (line.kind === "learning_path") {
      // Enroll in all courses within the learning path
      const path = getLearningPath(line.slug);
      if (path) {
        for (const pc of path.pathCourses) {
          if (!courseSlugsToEnroll.includes(pc.courseSlug)) {
            courseSlugsToEnroll.push(pc.courseSlug);
          }
        }
      }
    }
  }

  for (const courseSlug of courseSlugsToEnroll) {
    // Idempotency: skip if already enrolled
    if (enrollments.some((e) => e.userId === user.id && e.courseSlug === courseSlug)) continue;

    const course = getCourse(courseSlug);
    const enrollment = {
      id: `en-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      courseSlug,
      orderId,
      createdAt: faToday(),
      completed: [] as string[],
    };
    enrollments.push(enrollment);
    if (course?.protection?.spotPlayer) {
      const r = await createSpotLicense({ name: user.name, phone: user.phone, courseIds: course.protection.spotPlayerCourseIds, payload: orderId });
      if (r.ok) {
        enrollments[enrollments.length - 1] = { ...enrollment, spotLicense: r.license };
        await audit({ action: "spotplayer.license", actor: { id: user.id, name: user.name, role: user.role }, target: `course:${courseSlug}`, detail: { licenseId: r.license.id } });
      } else {
        await audit({ action: "spotplayer.error", level: "error", target: `course:${courseSlug}`, detail: { error: r.error, orderId } });
      }
    }
  }
  writeDb({
    enrollments,
    courses: getCourses().map((c) =>
      courseSlugsToEnroll.includes(c.slug) ? { ...c, students: c.students + 1 } : c
    ),
  });
}
