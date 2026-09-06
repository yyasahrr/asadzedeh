import type { SessionUser } from "./auth";
import { can } from "./auth";
import { getClasses, getCourses, getEnrollment, getInstructorByUser, getOrders } from "./store";
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
