"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { faToday, parsePrice } from "@/lib/format";
import { can, getSessionUser, hashPassword, type Permission, type SessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendEmail, sendSms } from "@/lib/notify";
import { deleteVideoFiles, resetFfmpegCache, transcodeToHls } from "@/lib/video";
import { createSpotLicense } from "@/lib/spotplayer";
import {
  getArticle,
  getArticles,
  getCertificate,
  getCertificates,
  getClass,
  getClasses,
  getComments,
  getCourse,
  getCourses,
  getEnrollments,
  getInstructor,
  getInstructors,
  getOrders,
  getPreorders,
  getProduct,
  getProducts,
  getSessions,
  getSettings,
  getStudents,
  getSubmissions,
  getSubscribers,
  getUserById,
  getUsers,
  getUserByPhone,
  getVideos,
  resetDb,
  writeDb,
} from "@/lib/store";
import type {
  Chapter,
  CourseProtection,
  Instructor,
  Lesson,
  LessonAttachment,
  PreorderStatus,
  Product,
  ShippingMethod,
  Trailer,
} from "@/lib/types";

/* ---------- helpers ---------- */

function actor(u: SessionUser) {
  return { id: u.id, name: u.name, role: u.role };
}

async function staff(perm: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!can(user, perm)) {
    await audit({ action: "admin.denied", level: "security", actor: user ? actor(user) : null, detail: { perm } });
    redirect("/admin");
  }
  return user as SessionUser;
}

function str(fd: FormData, key: string, fallback = ""): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : fallback;
}

function num(fd: FormData, key: string, fallback = 0): number {
  const n = Number(str(fd, key).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function numAllowZero(fd: FormData, key: string, fallback = 0): number {
  const raw = str(fd, key);
  if (raw === "") return fallback;
  const n = Number(raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function bool(fd: FormData, key: string): boolean {
  const v = str(fd, key);
  return v === "on" || v === "1" || v === "true";
}

function lines(value: string): string[] {
  return value.split("\n").map((l) => l.trim()).filter(Boolean);
}

function paragraphs(value: string): string[] {
  return value.split(/\n\s*\n/).map((p) => p.trim().replace(/\s+/g, " ")).filter(Boolean);
}

function uniqueSlug(base: string, exists: (s: string) => boolean): string {
  let slug = base;
  let i = 2;
  while (exists(slug)) slug = `${base}-${i++}`;
  return slug;
}

function newSlug(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

function slugify(input: string, prefix: string): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return /^[a-z0-9-]+$/.test(s) && s.length >= 3 ? s : newSlug(prefix);
}

function revalidateAll() {
  ["/", "/courses", "/classes", "/blog", "/paths", "/instructors", "/shop", "/admin", "/dashboard", "/instructor"].forEach((p) =>
    revalidatePath(p, "page")
  );
}

function parseTrailer(fd: FormData): Trailer | undefined {
  const kind = str(fd, "trailerKind") as Trailer["kind"];
  const src = str(fd, "trailerSrc");
  if (!kind || kind === "none" || !src) return undefined;
  if (kind === "embed") {
    // Accept only http(s) URLs; iframe embeds from Aparat/YouTube etc.
    if (!/^https?:\/\//i.test(src)) return undefined;
  }
  return { kind, src, poster: str(fd, "trailerPoster") || undefined };
}

function parseProtection(fd: FormData, base: CourseProtection): CourseProtection {
  return {
    securePlayer: bool(fd, "p_securePlayer"),
    burnWatermark: bool(fd, "p_burnWatermark"),
    overlayWatermark: bool(fd, "p_overlayWatermark"),
    spotPlayer: bool(fd, "p_spotPlayer"),
    spotPlayerCourseIds: lines(str(fd, "p_spotIds").replace(/[،,]/g, "\n")),
    maxDevices: num(fd, "p_maxDevices", base.maxDevices),
    blockDownload: bool(fd, "p_blockDownload"),
  };
}

function parseSyllabus(fd: FormData) {
  return lines(str(fd, "syllabus")).map((line) => {
    const [t, rest] = line.split(":");
    return {
      title: (t ?? line).trim(),
      lessons: rest ? rest.split(/[؛;]/).map((l) => l.trim()).filter(Boolean) : [],
    };
  });
}

function parseLessonAttachments(fd: FormData): LessonAttachment[] {
  try {
    const parsed = JSON.parse(str(fd, "attachments") || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const item = value as Partial<LessonAttachment>;
      const pathValue = typeof item.path === "string" ? item.path.trim() : "";
      const label = typeof item.label === "string" ? item.label.trim().slice(0, 120) : "";
      const allowedPath = pathValue.startsWith("/api/lesson-files/") || pathValue.startsWith("/uploads/");
      if (!allowedPath || !label) return [];
      return [{
        label,
        path: pathValue,
        fileName: typeof item.fileName === "string" ? item.fileName.slice(0, 180) : undefined,
        mime: typeof item.mime === "string" ? item.mime.slice(0, 100) : undefined,
        sizeBytes: typeof item.sizeBytes === "number" && item.sizeBytes > 0 ? item.sizeBytes : undefined,
      }];
    });
  } catch {
    return [];
  }
}

/* ---------- courses ---------- */

export async function createCourse(fd: FormData) {
  const me = await staff("courses");
  const title = str(fd, "title");
  if (!title) return;
  const syllabus = parseSyllabus(fd);
  const courses = getCourses();
  const instructorSlug = str(fd, "instructorSlug");
  const inst = instructorSlug ? getInstructor(instructorSlug) : undefined;
  const slug = uniqueSlug(newSlug("c"), (s) => courses.some((c) => c.slug === s));
  courses.unshift({
    slug,
    title,
    shortTitle: str(fd, "shortTitle") || title,
    category: str(fd, "category") || "فرش‌بافی",
    instructor: inst?.name || str(fd, "instructor") || "استاد ناصر اسد زاده",
    instructorRole: inst?.specialty ? `مدرس ${inst.specialty}` : "مدرس اسدزاده",
    instructorSlug: inst?.slug,
    level: (str(fd, "level") || "مقدماتی") as "مقدماتی",
    sessions: num(fd, "sessions", 10),
    hours: num(fd, "hours", 10),
    price: parsePrice(str(fd, "price")),
    oldPrice: parsePrice(str(fd, "oldPrice")) || undefined,
    rating: 5,
    students: 0,
    image: str(fd, "image") || "/images/course-carpet.jpg",
    excerpt: str(fd, "excerpt"),
    outcomes: lines(str(fd, "outcomes")),
    syllabus: syllabus.length > 0 ? syllabus : [{ title: "معرفی دوره", lessons: ["آشنایی با دوره"] }],
    badge: str(fd, "badge") || "جدید",
    trailer: parseTrailer(fd),
    protection: parseProtection(fd, getSettings().video.defaults),
    lessons: [],
  });
  writeDb({ courses });
  await audit({ action: "course.create", actor: actor(me), target: `course:${slug}`, detail: { title } });
  revalidateAll();
  redirect(`/admin/courses/${slug}/lessons?created=1`);
}

export async function updateCourse(fd: FormData) {
  const me = await staff("courses");
  const slug = str(fd, "slug");
  const prev = getCourse(slug);
  if (!prev) return;
  const syllabus = parseSyllabus(fd);
  const instructorSlug = str(fd, "instructorSlug");
  const inst = instructorSlug ? getInstructor(instructorSlug) : undefined;
  const courses = getCourses().map((c) =>
    c.slug === slug
      ? {
          ...c,
          title: str(fd, "title") || c.title,
          shortTitle: str(fd, "shortTitle") || c.shortTitle,
          category: str(fd, "category") || c.category,
          instructor: inst?.name || str(fd, "instructor") || c.instructor,
          instructorRole: inst?.specialty ? `مدرس ${inst.specialty}` : c.instructorRole,
          instructorSlug: inst?.slug ?? c.instructorSlug,
          level: (str(fd, "level") || c.level) as typeof c.level,
          sessions: num(fd, "sessions", c.sessions),
          hours: num(fd, "hours", c.hours),
          price: parsePrice(str(fd, "price")) || c.price,
          oldPrice: parsePrice(str(fd, "oldPrice")) || undefined,
          image: str(fd, "image") || c.image,
          excerpt: str(fd, "excerpt") || c.excerpt,
          outcomes: lines(str(fd, "outcomes")).length > 0 ? lines(str(fd, "outcomes")) : c.outcomes,
          syllabus: syllabus.length > 0 ? syllabus : c.syllabus,
          badge: str(fd, "badge") || undefined,
          trailer: parseTrailer(fd),
          protection: parseProtection(fd, c.protection ?? getSettings().video.defaults),
        }
      : c
  );
  writeDb({ courses });
  await audit({ action: "course.update", actor: actor(me), target: `course:${slug}` });
  revalidateAll();
  revalidatePath(`/courses/${slug}`);
  redirect("/admin/courses");
}

export async function deleteCourse(fd: FormData) {
  const me = await staff("courses");
  const slug = str(fd, "slug");
  writeDb({ courses: getCourses().filter((c) => c.slug !== slug) });
  await audit({ action: "course.delete", level: "warn", actor: actor(me), target: `course:${slug}` });
  revalidateAll();
  redirect("/admin/courses");
}

/* ---------- chapters ---------- */

export async function addChapter(fd: FormData) {
  const me = await staff("courses");
  const slug = str(fd, "slug");
  const title = str(fd, "title");
  const course = getCourse(slug);
  if (!course || !title) return;
  const chapters = course.chapters ?? [];
  const chapter: Chapter = {
    id: `ch-${Date.now().toString(36)}`,
    title,
    order: chapters.length + 1,
  };
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, chapters: [...chapters, chapter] } : c)) });
  await audit({ action: "course.chapter.add", actor: actor(me), target: `course:${slug}`, detail: { chapter: chapter.title } });
  revalidatePath(`/admin/courses/${slug}/lessons`);
  revalidatePath(`/courses/${slug}`);
  redirect(`/admin/courses/${slug}/lessons`);
}

export async function updateChapter(fd: FormData) {
  const me = await staff("courses");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const title = str(fd, "title");
  const course = getCourse(slug);
  if (!course || !title) return;
  const chapters = (course.chapters ?? []).map((ch) => (ch.id === id ? { ...ch, title } : ch));
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, chapters } : c)) });
  await audit({ action: "course.chapter.update", actor: actor(me), target: `course:${slug}`, detail: { chapterId: id, title } });
  revalidatePath(`/admin/courses/${slug}/lessons`);
  revalidatePath(`/courses/${slug}`);
  redirect(`/admin/courses/${slug}/lessons`);
}

export async function deleteChapter(fd: FormData) {
  const me = await staff("courses");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const course = getCourse(slug);
  if (!course) return;
  const chapters = (course.chapters ?? []).filter((ch) => ch.id !== id).map((ch, i) => ({ ...ch, order: i + 1 }));
  const lessons = (course.lessons ?? []).map((l) => l.chapterId === id ? { ...l, chapterId: chapters[0]?.id ?? "" } : l);
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, chapters, lessons } : c)) });
  await audit({ action: "course.chapter.delete", level: "warn", actor: actor(me), target: `course:${slug}`, detail: { chapterId: id } });
  revalidatePath(`/admin/courses/${slug}/lessons`);
  revalidatePath(`/courses/${slug}`);
  redirect(`/admin/courses/${slug}/lessons`);
}

export async function moveChapter(fd: FormData) {
  await staff("courses");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const course = getCourse(slug);
  if (!course) return;
  const chapters = [...(course.chapters ?? [])].sort((a, b) => a.order - b.order);
  const idx = chapters.findIndex((ch) => ch.id === id);
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= chapters.length) return;
  [chapters[idx], chapters[j]] = [chapters[j], chapters[idx]];
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, chapters: chapters.map((ch, i) => ({ ...ch, order: i + 1 })) } : c)) });
  revalidatePath(`/admin/courses/${slug}/lessons`);
}

/* ---------- class chapters ---------- */

export async function addClassChapter(fd: FormData) {
  const me = await staff("classes");
  const slug = str(fd, "slug");
  const title = str(fd, "title");
  const cls = getClass(slug);
  if (!cls || !title) return;
  const chapters = cls.chapters ?? [];
  const chapter: Chapter = {
    id: `ch-${Date.now().toString(36)}`,
    title,
    order: chapters.length + 1,
  };
  writeDb({ classes: getClasses().map((c) => (c.slug === slug ? { ...c, chapters: [...chapters, chapter] } : c)) });
  await audit({ action: "class.chapter.add", actor: actor(me), target: `class:${slug}`, detail: { chapter: chapter.title } });
  revalidatePath(`/admin/classes/${slug}/lessons`);
  redirect(`/admin/classes/${slug}/lessons`);
}

export async function updateClassChapter(fd: FormData) {
  const me = await staff("classes");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const title = str(fd, "title");
  const cls = getClass(slug);
  if (!cls || !title) return;
  const chapters = (cls.chapters ?? []).map((ch) => (ch.id === id ? { ...ch, title } : ch));
  writeDb({ classes: getClasses().map((c) => (c.slug === slug ? { ...c, chapters } : c)) });
  await audit({ action: "class.chapter.update", actor: actor(me), target: `class:${slug}`, detail: { chapterId: id, title } });
  revalidatePath(`/admin/classes/${slug}/lessons`);
  redirect(`/admin/classes/${slug}/lessons`);
}

export async function deleteClassChapter(fd: FormData) {
  const me = await staff("classes");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const cls = getClass(slug);
  if (!cls) return;
  const chapters = (cls.chapters ?? []).filter((ch) => ch.id !== id).map((ch, i) => ({ ...ch, order: i + 1 }));
  const lessons = (cls.lessons ?? []).map((l) => l.chapterId === id ? { ...l, chapterId: chapters[0]?.id ?? "" } : l);
  writeDb({ classes: getClasses().map((c) => (c.slug === slug ? { ...c, chapters, lessons } : c)) });
  await audit({ action: "class.chapter.delete", level: "warn", actor: actor(me), target: `class:${slug}`, detail: { chapterId: id } });
  revalidatePath(`/admin/classes/${slug}/lessons`);
  redirect(`/admin/classes/${slug}/lessons`);
}

export async function moveClassChapter(fd: FormData) {
  await staff("classes");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const cls = getClass(slug);
  if (!cls) return;
  const chapters = [...(cls.chapters ?? [])].sort((a, b) => a.order - b.order);
  const idx = chapters.findIndex((ch) => ch.id === id);
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= chapters.length) return;
  [chapters[idx], chapters[j]] = [chapters[j], chapters[idx]];
  writeDb({ classes: getClasses().map((c) => (c.slug === slug ? { ...c, chapters: chapters.map((ch, i) => ({ ...ch, order: i + 1 })) } : c)) });
  revalidatePath(`/admin/classes/${slug}/lessons`);
}

/* ---------- lessons (course episodes) ---------- */

export async function addLesson(fd: FormData) {
  const me = await staff("courses");
  const slug = str(fd, "slug");
  const course = getCourse(slug);
  const title = str(fd, "title");
  if (!course || !title) return;
  const lessons = course.lessons ?? [];
  const chapterId = str(fd, "chapterId") || course.chapters?.[0]?.id || "";
  const lesson: Lesson = {
    id: `l-${Date.now().toString(36)}`,
    title,
    chapterId,
    order: lessons.length + 1,
    videoId: str(fd, "videoId") || undefined,
    durationMin: num(fd, "durationMin", 10),
    free: bool(fd, "free"),
    description: str(fd, "description") || undefined,
    attachments: parseLessonAttachments(fd),
  };
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, lessons: [...lessons, lesson] } : c)) });
  await audit({ action: "course.lesson.add", actor: actor(me), target: `course:${slug}`, detail: { lesson: lesson.title, videoId: lesson.videoId } });
  revalidatePath(`/admin/courses/${slug}/lessons`);
  revalidatePath(`/courses/${slug}`);
  redirect(`/admin/courses/${slug}/lessons?chapter=${chapterId}`);
}

export async function updateLesson(fd: FormData) {
  const me = await staff("courses");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const course = getCourse(slug);
  if (!course) return;
  const lessons = (course.lessons ?? []).map((l) =>
    l.id === id
      ? {
          ...l,
          title: str(fd, "title") || l.title,
          chapterId: str(fd, "chapterId") || l.chapterId,
          order: num(fd, "order", l.order),
          videoId: str(fd, "videoId") || undefined,
          durationMin: num(fd, "durationMin", l.durationMin),
          free: bool(fd, "free"),
          description: str(fd, "description") || undefined,
          attachments: parseLessonAttachments(fd),
        }
      : l
  );
  lessons.sort((a, b) => a.order - b.order);
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, lessons } : c)) });
  await audit({ action: "course.lesson.update", actor: actor(me), target: `course:${slug}`, detail: { lessonId: id } });
  const chapterId = str(fd, "chapterId");
  revalidatePath(`/admin/courses/${slug}/lessons`);
  revalidatePath(`/courses/${slug}`);
  redirect(`/admin/courses/${slug}/lessons${chapterId ? `?chapter=${chapterId}` : ""}`);
}

export async function deleteLesson(fd: FormData) {
  const me = await staff("courses");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const course = getCourse(slug);
  if (!course) return;
  const lessons = (course.lessons ?? []).filter((l) => l.id !== id).map((l, i) => ({ ...l, order: i + 1 }));
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, lessons } : c)) });
  await audit({ action: "course.lesson.delete", level: "warn", actor: actor(me), target: `course:${slug}`, detail: { lessonId: id } });
  revalidatePath(`/admin/courses/${slug}/lessons`);
  redirect(`/admin/courses/${slug}/lessons`);
}

export async function moveLesson(fd: FormData) {
  await staff("courses");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const course = getCourse(slug);
  if (!course) return;
  const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
  const idx = lessons.findIndex((l) => l.id === id);
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= lessons.length) return;
  [lessons[idx], lessons[j]] = [lessons[j], lessons[idx]];
  writeDb({ courses: getCourses().map((c) => (c.slug === slug ? { ...c, lessons: lessons.map((l, i) => ({ ...l, order: i + 1 })) } : c)) });
  revalidatePath(`/admin/courses/${slug}/lessons`);
}

/* ---------- videos ---------- */

export async function updateVideoTitle(fd: FormData) {
  const me = await staff("videos");
  const id = str(fd, "id");
  const title = str(fd, "title");
  if (!id || !title) return;
  writeDb({ videos: getVideos().map((v) => (v.id === id ? { ...v, title } : v)) });
  await audit({ action: "video.upload", actor: actor(me), target: `video:${id}`, detail: { renamed: title } });
  revalidatePath("/admin/videos");
}

export async function deleteVideo(fd: FormData) {
  const me = await staff("videos");
  const id = str(fd, "id");
  const video = getVideos().find((v) => v.id === id);
  if (!video) return;
  deleteVideoFiles(video);
  writeDb({
    videos: getVideos().filter((v) => v.id !== id),
    courses: getCourses().map((c) => ({
      ...c,
      lessons: (c.lessons ?? []).map((l) => (l.videoId === id ? { ...l, videoId: undefined } : l)),
      trailer: c.trailer?.kind === "upload" && c.trailer.src === id ? undefined : c.trailer,
    })),
    classes: getClasses().map((c) => ({
      ...c,
      lessons: (c.lessons ?? []).map((lesson) => lesson.videoId === id ? { ...lesson, videoId: undefined } : lesson),
      trailer: c.trailer?.kind === "upload" && c.trailer.src === id ? undefined : c.trailer,
    })),
  });
  await audit({ action: "video.delete", level: "warn", actor: actor(me), target: `video:${id}`, detail: { title: video.title } });
  revalidatePath("/admin/videos");
  redirect("/admin/videos");
}

export async function retranscodeVideo(fd: FormData) {
  const me = await staff("videos");
  const id = str(fd, "id");
  const video = getVideos().find((v) => v.id === id);
  if (!video) return;
  resetFfmpegCache();
  await audit({ action: "video.transcode", actor: actor(me), target: `video:${id}` });
  void transcodeToHls(video);
  revalidatePath("/admin/videos");
  redirect("/admin/videos?queued=1");
}

/* ---------- classes ---------- */

export async function createClass(fd: FormData) {
  const me = await staff("classes");
  const title = str(fd, "title");
  if (!title) return;
  const capacity = num(fd, "capacity", 10);
  const classes = getClasses();
  const instructorSlug = str(fd, "instructorSlug");
  const inst = instructorSlug ? getInstructor(instructorSlug) : undefined;
  const slug = uniqueSlug(newSlug("k"), (s) => classes.some((c) => c.slug === s));
  classes.unshift({
    slug,
    title,
    instructor: inst?.name || str(fd, "instructor") || "استاد ناصر اسد زاده",
    instructorSlug: inst?.slug,
    startDate: str(fd, "startDate"),
    days: str(fd, "days"),
    time: str(fd, "time"),
    sessions: num(fd, "sessions", 8),
    capacity,
    remaining: capacity,
    location: str(fd, "location") || "کارگاه اسدزاده، ارومیه",
    price: parsePrice(str(fd, "price")),
    image: str(fd, "image") || "/images/workshop-loom.jpg",
    excerpt: str(fd, "excerpt"),
    includes: lines(str(fd, "includes")),
    trailer: parseTrailer(fd),
    lessons: [],
  });
  writeDb({ classes });
  await audit({ action: "class.create", actor: actor(me), target: `class:${slug}`, detail: { title } });
  revalidateAll();
  redirect(`/admin/classes/${slug}/lessons?created=1`);
}

export async function updateClass(fd: FormData) {
  const me = await staff("classes");
  const slug = str(fd, "slug");
  const prev = getClass(slug);
  if (!prev) return;
  const capacity = num(fd, "capacity", prev.capacity);
  const instructorSlug = str(fd, "instructorSlug");
  const inst = instructorSlug ? getInstructor(instructorSlug) : undefined;
  const classes = getClasses().map((c) =>
    c.slug === slug
      ? {
          ...c,
          title: str(fd, "title") || c.title,
          instructor: inst?.name || str(fd, "instructor") || c.instructor,
          instructorSlug: inst?.slug ?? c.instructorSlug,
          startDate: str(fd, "startDate") || c.startDate,
          days: str(fd, "days") || c.days,
          time: str(fd, "time") || c.time,
          sessions: num(fd, "sessions", c.sessions),
          capacity,
          remaining: Math.min(num(fd, "remaining", c.remaining), capacity),
          location: str(fd, "location") || c.location,
          price: parsePrice(str(fd, "price")) || c.price,
          image: str(fd, "image") || c.image,
          excerpt: str(fd, "excerpt") || c.excerpt,
          includes: lines(str(fd, "includes")).length > 0 ? lines(str(fd, "includes")) : c.includes,
          trailer: parseTrailer(fd),
        }
      : c
  );
  writeDb({ classes });
  await audit({ action: "class.update", actor: actor(me), target: `class:${slug}` });
  revalidateAll();
  revalidatePath(`/classes/${slug}`);
  redirect("/admin/classes");
}

export async function deleteClass(fd: FormData) {
  const me = await staff("classes");
  const slug = str(fd, "slug");
  writeDb({ classes: getClasses().filter((c) => c.slug !== slug) });
  await audit({ action: "class.delete", level: "warn", actor: actor(me), target: `class:${slug}` });
  revalidateAll();
  redirect("/admin/classes");
}

/* ---------- in-person class lessons ---------- */

export async function addClassLesson(fd: FormData) {
  const me = await staff("classes");
  const slug = str(fd, "slug");
  const inPersonClass = getClass(slug);
  const title = str(fd, "title");
  if (!inPersonClass || !title) return;
  const lessons = inPersonClass.lessons ?? [];
  const chapterId = str(fd, "chapterId") || inPersonClass.chapters?.[0]?.id || "";
  const lesson: Lesson = {
    id: `cl-${Date.now().toString(36)}`,
    title,
    chapterId,
    order: lessons.length + 1,
    videoId: str(fd, "videoId") || undefined,
    durationMin: num(fd, "durationMin", 10),
    free: bool(fd, "free"),
    description: str(fd, "description") || undefined,
    attachments: parseLessonAttachments(fd),
  };
  writeDb({ classes: getClasses().map((item) => item.slug === slug ? { ...item, lessons: [...lessons, lesson] } : item) });
  await audit({ action: "class.lesson.add", actor: actor(me), target: `class:${slug}`, detail: { lesson: lesson.title, videoId: lesson.videoId } });
  revalidatePath(`/admin/classes/${slug}/lessons`);
  revalidatePath(`/classes/${slug}`);
  revalidatePath(`/dashboard/classes/${slug}`);
  redirect(`/admin/classes/${slug}/lessons?chapter=${chapterId}`);
}

export async function updateClassLesson(fd: FormData) {
  const me = await staff("classes");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const inPersonClass = getClass(slug);
  if (!inPersonClass) return;
  const lessons = (inPersonClass.lessons ?? []).map((lesson) =>
    lesson.id === id
      ? {
          ...lesson,
          title: str(fd, "title") || lesson.title,
          chapterId: str(fd, "chapterId") || lesson.chapterId,
          order: num(fd, "order", lesson.order),
          videoId: str(fd, "videoId") || undefined,
          durationMin: num(fd, "durationMin", lesson.durationMin),
          free: bool(fd, "free"),
          description: str(fd, "description") || undefined,
          attachments: parseLessonAttachments(fd),
        }
      : lesson,
  );
  lessons.sort((a, b) => a.order - b.order);
  writeDb({ classes: getClasses().map((item) => item.slug === slug ? { ...item, lessons } : item) });
  await audit({ action: "class.lesson.update", actor: actor(me), target: `class:${slug}`, detail: { lessonId: id } });
  const chapterId = str(fd, "chapterId");
  revalidatePath(`/admin/classes/${slug}/lessons`);
  revalidatePath(`/classes/${slug}`);
  revalidatePath(`/dashboard/classes/${slug}`);
  redirect(`/admin/classes/${slug}/lessons${chapterId ? `?chapter=${chapterId}` : ""}`);
}

export async function deleteClassLesson(fd: FormData) {
  const me = await staff("classes");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const inPersonClass = getClass(slug);
  if (!inPersonClass) return;
  const lessons = (inPersonClass.lessons ?? [])
    .filter((lesson) => lesson.id !== id)
    .map((lesson, index) => ({ ...lesson, order: index + 1 }));
  writeDb({ classes: getClasses().map((item) => item.slug === slug ? { ...item, lessons } : item) });
  await audit({ action: "class.lesson.delete", level: "warn", actor: actor(me), target: `class:${slug}`, detail: { lessonId: id } });
  revalidatePath(`/admin/classes/${slug}/lessons`);
  revalidatePath(`/dashboard/classes/${slug}`);
  redirect(`/admin/classes/${slug}/lessons`);
}

export async function moveClassLesson(fd: FormData) {
  await staff("classes");
  const slug = str(fd, "slug");
  const id = str(fd, "id");
  const direction = str(fd, "dir") === "up" ? -1 : 1;
  const inPersonClass = getClass(slug);
  if (!inPersonClass) return;
  const lessons = [...(inPersonClass.lessons ?? [])].sort((a, b) => a.order - b.order);
  const index = lessons.findIndex((lesson) => lesson.id === id);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= lessons.length) return;
  [lessons[index], lessons[targetIndex]] = [lessons[targetIndex], lessons[index]];
  writeDb({
    classes: getClasses().map((item) =>
      item.slug === slug ? { ...item, lessons: lessons.map((lesson, lessonIndex) => ({ ...lesson, order: lessonIndex + 1 })) } : item,
    ),
  });
  revalidatePath(`/admin/classes/${slug}/lessons`);
  revalidatePath(`/classes/${slug}`);
  revalidatePath(`/dashboard/classes/${slug}`);
}

/* ---------- instructors ---------- */

export async function createInstructor(fd: FormData) {
  const me = await staff("instructors");
  const name = str(fd, "name");
  if (!name) return;
  const instructors = getInstructors();
  const slug = uniqueSlug(slugify(str(fd, "slug") || name, "inst"), (s) => instructors.some((i) => i.slug === s));
  const phone = str(fd, "phone");
  const password = str(fd, "password");
  let userId: string | undefined;

  // Optionally create a login account with the "instructor" role.
  if (phone && password.length >= 6) {
    const existing = getUserByPhone(phone);
    if (existing) {
      if (existing.role === "student") {
        writeDb({ users: getUsers().map((u) => (u.id === existing.id ? { ...u, role: "instructor" } : u)) });
      }
      userId = existing.id;
    } else {
      const users = getUsers();
      userId = `u-${Date.now().toString(36)}`;
      users.push({ id: userId, name, phone, passwordHash: hashPassword(password), role: "instructor", createdAt: faToday() });
      writeDb({ users });
      await audit({ action: "user.create", actor: actor(me), target: `user:${userId}`, detail: { role: "instructor" } });
    }
  }

  const inst: Instructor = {
    slug,
    name,
    specialty: str(fd, "specialty") || "مدرس",
    experience: str(fd, "experience") || "—",
    students: num(fd, "students", 0),
    courses: 0,
    image: str(fd, "image") || "/images/instructor-dyer.jpg",
    bio: str(fd, "bio"),
    about: paragraphs(str(fd, "about")),
    userId,
    phone: phone || undefined,
    email: str(fd, "email") || undefined,
    instagram: str(fd, "instagram") || undefined,
    commissionPercent: numAllowZero(fd, "commissionPercent", 60),
    featured: bool(fd, "featured"),
    active: true,
    createdAt: faToday(),
  };
  writeDb({ instructors: [...instructors, inst] });
  await audit({ action: "instructor.create", actor: actor(me), target: `instructor:${slug}`, detail: { name, linkedUser: !!userId } });
  revalidateAll();
  redirect("/admin/instructors");
}

export async function updateInstructor(fd: FormData) {
  const me = await staff("instructors");
  const slug = str(fd, "slug");
  const prev = getInstructor(slug);
  if (!prev) return;
  const phone = str(fd, "phone");
  const password = str(fd, "password");
  let userId = prev.userId;

  if (phone && !userId) {
    const existing = getUserByPhone(phone);
    if (existing) {
      userId = existing.id;
      if (existing.role === "student") writeDb({ users: getUsers().map((u) => (u.id === existing.id ? { ...u, role: "instructor" } : u)) });
    } else if (password.length >= 6) {
      const users = getUsers();
      userId = `u-${Date.now().toString(36)}`;
      users.push({ id: userId, name: str(fd, "name") || prev.name, phone, passwordHash: hashPassword(password), role: "instructor", createdAt: faToday() });
      writeDb({ users });
      await audit({ action: "user.create", actor: actor(me), target: `user:${userId}`, detail: { role: "instructor" } });
    }
  } else if (userId && password.length >= 6) {
    writeDb({ users: getUsers().map((u) => (u.id === userId ? { ...u, passwordHash: hashPassword(password) } : u)) });
    await audit({ action: "settings.update", level: "security", actor: actor(me), target: `user:${userId}`, detail: { passwordResetByAdmin: true } });
  }

  const name = str(fd, "name") || prev.name;
  writeDb({
    instructors: getInstructors().map((i) =>
      i.slug === slug
        ? {
            ...i,
            name,
            specialty: str(fd, "specialty") || i.specialty,
            experience: str(fd, "experience") || i.experience,
            students: num(fd, "students", i.students),
            image: str(fd, "image") || i.image,
            bio: str(fd, "bio") || i.bio,
            about: paragraphs(str(fd, "about")).length > 0 ? paragraphs(str(fd, "about")) : i.about,
            userId,
            phone: phone || i.phone,
            email: str(fd, "email") || i.email,
            instagram: str(fd, "instagram") || i.instagram,
            commissionPercent: numAllowZero(fd, "commissionPercent", i.commissionPercent ?? 60),
            featured: bool(fd, "featured"),
            active: bool(fd, "active"),
          }
        : i
    ),
    // keep the name in sync on courses/classes
    courses: getCourses().map((c) => (c.instructorSlug === slug ? { ...c, instructor: name } : c)),
    classes: getClasses().map((c) => (c.instructorSlug === slug ? { ...c, instructor: name } : c)),
  });
  await audit({ action: "instructor.update", actor: actor(me), target: `instructor:${slug}` });
  revalidateAll();
  redirect("/admin/instructors");
}

export async function deleteInstructor(fd: FormData) {
  const me = await staff("instructors");
  const slug = str(fd, "slug");
  const inst = getInstructor(slug);
  if (!inst) return;
  writeDb({
    instructors: getInstructors().filter((i) => i.slug !== slug),
    users: inst.userId ? getUsers().map((u) => (u.id === inst.userId && u.role === "instructor" ? { ...u, role: "student" } : u)) : getUsers(),
  });
  await audit({ action: "instructor.delete", level: "warn", actor: actor(me), target: `instructor:${slug}` });
  revalidateAll();
  redirect("/admin/instructors");
}

/* ---------- shop: products ---------- */

function parseProduct(fd: FormData, prev?: Product): Omit<Product, "slug" | "createdAt" | "sold"> {
  const kind = (str(fd, "kind") || prev?.kind || "physical") as Product["kind"];
  const specs = lines(str(fd, "specs"))
    .map((l) => {
      const [label, ...rest] = l.split(":");
      return { label: label.trim(), value: rest.join(":").trim() };
    })
    .filter((s) => s.label && s.value);
  const gallery = lines(str(fd, "gallery"));
  const image = str(fd, "image") || prev?.image || "/images/workshop-loom.jpg";
  return {
    title: str(fd, "title") || prev?.title || "",
    category: str(fd, "category") || prev?.category || "ابزار",
    kind,
    price: parsePrice(str(fd, "price")) || prev?.price || 0,
    oldPrice: parsePrice(str(fd, "oldPrice")) || undefined,
    stock: numAllowZero(fd, "stock", prev?.stock ?? 0),
    allowBackorder: bool(fd, "allowBackorder"),
    preorder:
      kind === "preorder"
        ? {
            depositPercent: numAllowZero(fd, "depositPercent", prev?.preorder?.depositPercent ?? getSettings().shop.preorderDepositPercent),
            leadTimeDays: num(fd, "leadTimeDays", prev?.preorder?.leadTimeDays ?? 21),
            note: str(fd, "preorderNote") || prev?.preorder?.note || "",
          }
        : undefined,
    image,
    gallery: gallery.length > 0 ? gallery : [image],
    excerpt: str(fd, "excerpt") || prev?.excerpt || "",
    description: paragraphs(str(fd, "description")).length > 0 ? paragraphs(str(fd, "description")) : prev?.description ?? [],
    specs: specs.length > 0 ? specs : prev?.specs ?? [],
    shippingMethods: fd.getAll("shippingMethods").map(String).filter(Boolean),
    weightGrams: numAllowZero(fd, "weightGrams", prev?.weightGrams ?? 0),
    badge: str(fd, "badge") || undefined,
    featured: bool(fd, "featured"),
    active: bool(fd, "active"),
    sku: str(fd, "sku") || prev?.sku,
    variants: prev?.variants,
  };
}

export async function createProduct(fd: FormData) {
  const me = await staff("shop");
  const data = parseProduct(fd);
  if (!data.title) return;
  const products = getProducts();
  const slug = uniqueSlug(slugify(str(fd, "slug") || data.title, "p"), (s) => products.some((p) => p.slug === s));
  products.unshift({ ...data, slug, createdAt: faToday(), sold: 0 });
  writeDb({ products });
  await audit({ action: "product.create", actor: actor(me), target: `product:${slug}`, detail: { title: data.title, price: data.price, stock: data.stock } });
  revalidateAll();
  redirect("/admin/shop");
}

export async function updateProduct(fd: FormData) {
  const me = await staff("shop");
  const slug = str(fd, "slug");
  const prev = getProduct(slug);
  if (!prev) return;
  const data = parseProduct(fd, prev);
  writeDb({ products: getProducts().map((p) => (p.slug === slug ? { ...p, ...data } : p)) });
  await audit({ action: "product.update", actor: actor(me), target: `product:${slug}`, detail: { price: data.price, stock: data.stock } });
  revalidateAll();
  revalidatePath(`/shop/${slug}`);
  redirect("/admin/shop");
}

export async function adjustStock(fd: FormData) {
  const me = await staff("shop");
  const slug = str(fd, "slug");
  const delta = Number(str(fd, "delta").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
  const prev = getProduct(slug);
  if (!prev || !Number.isFinite(delta)) return;
  const stock = Math.max(0, prev.stock + delta);
  writeDb({ products: getProducts().map((p) => (p.slug === slug ? { ...p, stock } : p)) });
  await audit({ action: "product.stock", actor: actor(me), target: `product:${slug}`, detail: { from: prev.stock, to: stock } });
  revalidatePath("/admin/shop");
  revalidatePath(`/shop/${slug}`);
}

export async function deleteProduct(fd: FormData) {
  const me = await staff("shop");
  const slug = str(fd, "slug");
  writeDb({ products: getProducts().filter((p) => p.slug !== slug) });
  await audit({ action: "product.delete", level: "warn", actor: actor(me), target: `product:${slug}` });
  revalidateAll();
  redirect("/admin/shop");
}

export async function saveShopSettings(fd: FormData) {
  const me = await staff("shop");
  const s = getSettings();
  const methods: ShippingMethod[] = s.shop.shippingMethods.map((m) => ({
    ...m,
    label: str(fd, `m_${m.id}_label`) || m.label,
    description: str(fd, `m_${m.id}_desc`) || m.description,
    cost: numAllowZero(fd, `m_${m.id}_cost`, m.cost),
    etaDays: str(fd, `m_${m.id}_eta`) || m.etaDays,
    active: bool(fd, `m_${m.id}_active`),
  }));
  const newLabel = str(fd, "new_label");
  if (newLabel) {
    methods.push({
      id: slugify(str(fd, "new_id") || newLabel, "ship"),
      label: newLabel,
      description: str(fd, "new_desc"),
      cost: numAllowZero(fd, "new_cost", 0),
      freeOver: 0,
      etaDays: str(fd, "new_eta") || "—",
      active: true,
    });
  }
  writeDb({
    settings: {
      ...s,
      shop: {
        ...s.shop,
        enabled: bool(fd, "enabled"),
        title: str(fd, "title") || s.shop.title,
        description: str(fd, "description") || s.shop.description,
        freeShippingOver: numAllowZero(fd, "freeShippingOver", s.shop.freeShippingOver),
        preorderDepositPercent: numAllowZero(fd, "preorderDepositPercent", s.shop.preorderDepositPercent),
        preorderIntro: str(fd, "preorderIntro") || s.shop.preorderIntro,
        shippingMethods: methods,
      },
    },
  });
  await audit({ action: "settings.update", actor: actor(me), detail: { section: "shop" } });
  revalidateAll();
  redirect("/admin/shop/settings?saved=1");
}

/* ---------- shop: preorders ---------- */

export async function updatePreorder(fd: FormData) {
  const me = await staff("preorders");
  const id = str(fd, "id");
  const prev = getPreorders().find((p) => p.id === id);
  if (!prev) return;
  const status = (str(fd, "status") || prev.status) as PreorderStatus;
  const note = str(fd, "note");
  const quotedPrice = parsePrice(str(fd, "quotedPrice")) || prev.quotedPrice;
  const depositPercent = getProduct(prev.productSlug)?.preorder?.depositPercent ?? getSettings().shop.preorderDepositPercent;
  const deposit = Math.round((quotedPrice * depositPercent) / 100);
  const changed = status !== prev.status || quotedPrice !== prev.quotedPrice;
  writeDb({
    preorders: getPreorders().map((p) =>
      p.id === id
        ? {
            ...p,
            status,
            quotedPrice,
            deposit,
            eta: str(fd, "eta") || p.eta,
            depositPaid: bool(fd, "depositPaid") || p.depositPaid,
            timeline: changed || note ? [...p.timeline, { date: faToday(), status, note: note || undefined }] : p.timeline,
          }
        : p
    ),
  });
  await audit({ action: "preorder.update", actor: actor(me), target: `preorder:${id}`, detail: { status, quotedPrice } });
  if (changed && prev.phone) {
    await sendSms([prev.phone], `اسدزاده: وضعیت پیش‌سفارش ${id} به «${status}» تغییر کرد. قیمت: ${quotedPrice.toLocaleString("fa-IR")} تومان`);
  }
  revalidatePath("/admin/preorders");
  revalidatePath("/dashboard/orders");
  redirect("/admin/preorders");
}

/* ---------- students ---------- */

export async function addStudent(fd: FormData) {
  const me = await staff("students");
  const name = str(fd, "name");
  if (!name) return;
  const students = getStudents();
  students.unshift({
    name,
    phone: str(fd, "phone"),
    courses: num(fd, "courses", 1),
    joinDate: str(fd, "joinDate") || faToday(),
    status: str(fd, "status") || "فعال",
  });
  writeDb({ students });
  await audit({ action: "user.create", actor: actor(me), detail: { student: name } });
  revalidatePath("/admin/students");
  redirect("/admin/students");
}

export async function deleteStudent(fd: FormData) {
  const me = await staff("students");
  const phone = str(fd, "phone");
  writeDb({ students: getStudents().filter((s) => s.phone !== phone) });
  await audit({ action: "user.role", level: "warn", actor: actor(me), detail: { deletedStudent: phone } });
  revalidatePath("/admin/students");
  redirect("/admin/students");
}

/* ---------- orders ---------- */

export async function updateOrderStatus(fd: FormData) {
  const me = await staff("orders");
  const id = str(fd, "id");
  const status = str(fd, "status");
  const trackingCode = str(fd, "trackingCode");
  if (!id || !status) return;
  const prev = getOrders().find((o) => o.id === id);
  writeDb({
    orders: getOrders().map((o) =>
      o.id === id
        ? { ...o, status, shipping: o.shipping ? { ...o.shipping, trackingCode: trackingCode || o.shipping.trackingCode } : o.shipping }
        : o
    ),
  });
  await audit({ action: "order.status", actor: actor(me), target: `order:${id}`, detail: { from: prev?.status, to: status, trackingCode } });
  if (prev && status === "پرداخت شده" && prev.status !== "پرداخت شده") {
    await grantAccessForOrder(id);
  }
  if (prev?.phone && (status === "ارسال شده" || trackingCode)) {
    await sendSms([prev.phone], `اسدزاده: سفارش ${id} ارسال شد.${trackingCode ? ` کد رهگیری: ${trackingCode}` : ""}`);
  }
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

/** Create enrollments (and SpotPlayer licenses) for the course lines of a paid order. */
export async function grantAccessForOrder(orderId: string) {
  const order = getOrders().find((o) => o.id === orderId);
  if (!order?.userId || !order.lines) return;
  const user = getUserById(order.userId);
  if (!user) return;
  const enrollments = getEnrollments();
  for (const line of order.lines) {
    if (line.kind !== "course") continue;
    if (enrollments.some((e) => e.userId === user.id && e.courseSlug === line.slug)) continue;
    const course = getCourse(line.slug);
    const enrollment = {
      id: `en-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      courseSlug: line.slug,
      orderId,
      createdAt: faToday(),
      completed: [] as string[],
    };
    enrollments.push(enrollment);
    if (course?.protection?.spotPlayer) {
      const r = await createSpotLicense({ name: user.name, phone: user.phone, courseIds: course.protection.spotPlayerCourseIds, payload: orderId });
      if (r.ok) {
        enrollments[enrollments.length - 1] = { ...enrollment, spotLicense: r.license };
        await audit({ action: "spotplayer.license", actor: { id: user.id, name: user.name, role: user.role }, target: `course:${line.slug}`, detail: { licenseId: r.license.id } });
      } else {
        await audit({ action: "spotplayer.error", level: "error", target: `course:${line.slug}`, detail: { error: r.error, orderId } });
      }
    }
  }
  writeDb({
    enrollments,
    courses: getCourses().map((c) =>
      order.lines!.some((l) => l.kind === "course" && l.slug === c.slug) ? { ...c, students: c.students + 1 } : c
    ),
  });
}

/* ---------- certificates ---------- */

export async function issueCertificate(fd: FormData) {
  const me = await staff("certificates");
  const student = str(fd, "student");
  const course = str(fd, "course");
  if (!student || !course) return;
  const certs = getCertificates();
  let code = str(fd, "code");
  if (!code || getCertificate(code)) {
    const maxNum = certs.reduce((m, c) => {
      const n = Number(c.code.replace(/[^0-9]/g, ""));
      return Number.isFinite(n) && n > m ? n : m;
    }, 1200);
    code = `AZ-C-${maxNum + 1}`;
  }
  certs.unshift({
    code,
    student,
    course,
    date: str(fd, "date") || faToday(),
    hours: num(fd, "hours", 12),
  });
  writeDb({ certificates: certs });
  await audit({ action: "certificate.issue", actor: actor(me), target: `certificate:${code}`, detail: { student, course } });
  revalidatePath("/admin/certificates");
  redirect("/admin/certificates");
}

export async function deleteCertificate(fd: FormData) {
  const me = await staff("certificates");
  const code = str(fd, "code");
  writeDb({ certificates: getCertificates().filter((c) => c.code !== code) });
  await audit({ action: "certificate.delete", level: "warn", actor: actor(me), target: `certificate:${code}` });
  revalidatePath("/admin/certificates");
  redirect("/admin/certificates");
}

/* ---------- articles ---------- */

export async function createArticle(fd: FormData) {
  const me = await staff("blog");
  const title = str(fd, "title");
  if (!title) return;
  const articles = getArticles();
  const slug = uniqueSlug(newSlug("a"), (s) => articles.some((a) => a.slug === s));
  articles.unshift({
    slug,
    title,
    category: str(fd, "category") || "دانشنامه",
    excerpt: str(fd, "excerpt"),
    minutes: num(fd, "minutes", 5),
    date: faToday(),
    image: str(fd, "image") || "/images/course-carpet.jpg",
    body: paragraphs(str(fd, "body")),
  });
  writeDb({ articles });
  await audit({ action: "content.update", actor: actor(me), target: `article:${slug}`, detail: { created: title } });
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function updateArticle(fd: FormData) {
  const me = await staff("blog");
  const slug = str(fd, "slug");
  const prev = getArticle(slug);
  if (!prev) return;
  const body = paragraphs(str(fd, "body"));
  writeDb({
    articles: getArticles().map((a) =>
      a.slug === slug
        ? {
            ...a,
            title: str(fd, "title") || a.title,
            category: str(fd, "category") || a.category,
            excerpt: str(fd, "excerpt") || a.excerpt,
            minutes: num(fd, "minutes", a.minutes),
            image: str(fd, "image") || a.image,
            body: body.length > 0 ? body : a.body,
          }
        : a
    ),
  });
  await audit({ action: "content.update", actor: actor(me), target: `article:${slug}` });
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  redirect("/admin/blog");
}

export async function deleteArticle(fd: FormData) {
  const me = await staff("blog");
  const slug = str(fd, "slug");
  writeDb({ articles: getArticles().filter((a) => a.slug !== slug) });
  await audit({ action: "content.update", level: "warn", actor: actor(me), target: `article:${slug}`, detail: { deleted: true } });
  revalidatePath("/blog");
  redirect("/admin/blog");
}

/* ---------- comments ---------- */

export async function approveComment(fd: FormData) {
  const me = await staff("comments");
  const id = str(fd, "id");
  writeDb({ comments: getComments().map((c) => (c.id === id ? { ...c, status: "approved" as const } : c)) });
  await audit({ action: "content.update", actor: actor(me), target: `comment:${id}`, detail: { approved: true } });
  revalidateAll();
  redirect("/admin/comments");
}

export async function deleteComment(fd: FormData) {
  const me = await staff("comments");
  const id = str(fd, "id");
  writeDb({ comments: getComments().filter((c) => c.id !== id) });
  await audit({ action: "content.update", level: "warn", actor: actor(me), target: `comment:${id}`, detail: { deleted: true } });
  revalidateAll();
  redirect("/admin/comments");
}

/* ---------- submissions ---------- */

export async function reviewSubmission(fd: FormData) {
  const me = await staff("submissions");
  const id = str(fd, "id");
  const status = str(fd, "status") as "تأیید شده" | "نیاز به اصلاح" | "در حال بررسی";
  const note = str(fd, "note");
  writeDb({
    submissions: getSubmissions().map((s) =>
      s.id === id ? { ...s, status, note: note || s.note } : s
    ),
  });
  await audit({ action: "content.update", actor: actor(me), target: `submission:${id}`, detail: { status } });
  revalidatePath("/admin/submissions");
  revalidatePath("/dashboard/assignments");
}

/* ---------- media ---------- */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function sanitize(name: string): string {
  return name.replace(/[^\w.\-()\s\u0600-\u06FF]/g, "").replace(/\s+/g, "-").slice(-80) || "file";
}

export async function uploadMedia(fd: FormData): Promise<{ ok: boolean; path?: string; error?: string }> {
  const user = await getSessionUser();
  const allowed = can(user, "media") || can(user, "content") || can(user, "blog") || can(user, "shop") || user?.role === "instructor";
  if (!allowed) {
    return { ok: false, error: "دسترسی ندارید" };
  }
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "فایلی انتخاب نشده" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "فقط تصویر مجاز است" };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "حجم تصویر بیش از ۵ مگابایت است" };
  const name = `${Date.now().toString(36)}-${sanitize(file.name)}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  await audit({ action: "media.upload", actor: actor(user!), detail: { name, size: file.size } });
  revalidatePath("/admin/media");
  return { ok: true, path: `/uploads/${name}` };
}

export async function deleteMedia(fd: FormData) {
  const me = await staff("media");
  const p = str(fd, "path");
  if (!p.startsWith("/uploads/") || p.includes("..")) return;
  try {
    fs.unlinkSync(path.join(process.cwd(), "public", p));
  } catch {
    /* already gone */
  }
  await audit({ action: "media.delete", level: "warn", actor: actor(me), detail: { path: p } });
  revalidatePath("/admin/media");
  redirect("/admin/media");
}

/* ---------- site content (CMS) ---------- */

export async function saveSiteContent(fd: FormData) {
  const me = await staff("content");
  const s = getSettings();
  const site = {
    ...s.site,
    siteName: str(fd, "siteName") || s.site.siteName,
    tagline: str(fd, "tagline") || s.site.tagline,
    phone: str(fd, "phone") || s.site.phone,
    email: str(fd, "email") || s.site.email,
    address: str(fd, "address") || s.site.address,
    siteUrl: str(fd, "siteUrl") || s.site.siteUrl,
    announcement: {
      enabled: str(fd, "annEnabled") === "on",
      text: str(fd, "annText") || s.site.announcement.text,
      link: str(fd, "annLink") || "/",
    },
    hero: {
      badge: str(fd, "heroBadge") || s.site.hero.badge,
      titleA: str(fd, "heroA") || s.site.hero.titleA,
      titleHighlight: str(fd, "heroHl") || s.site.hero.titleHighlight,
      titleB: str(fd, "heroB") || s.site.hero.titleB,
      subtitle: str(fd, "heroSub") || s.site.hero.subtitle,
      primaryCta: str(fd, "heroCta1") || s.site.hero.primaryCta,
      secondaryCta: str(fd, "heroCta2") || s.site.hero.secondaryCta,
      image: str(fd, "heroImage") || s.site.hero.image,
      note: str(fd, "heroNote") || s.site.hero.note,
    },
    footerAbout: str(fd, "footerAbout") || s.site.footerAbout,
    socials: {
      instagram: str(fd, "instagram") || s.site.socials.instagram,
      telegram: str(fd, "telegram") || s.site.socials.telegram,
    },
    aboutIntro: paragraphs(str(fd, "aboutIntro")).length > 0 ? paragraphs(str(fd, "aboutIntro")) : s.site.aboutIntro,
  };
  const instagram = {
    ...s.instagram,
    enabled: bool(fd, "igEnabled"),
    username: str(fd, "igUsername").replace(/^@/, "") || s.instagram.username,
    posts: lines(str(fd, "igPosts")).filter((u) => /^https?:\/\/(www\.)?instagram\.com\//i.test(u)).slice(0, 6),
    embedUrl: /^https?:\/\//i.test(str(fd, "igEmbed")) ? str(fd, "igEmbed") : "",
    title: str(fd, "igTitle") || s.instagram.title,
    description: str(fd, "igDesc") || s.instagram.description,
  };
  writeDb({ settings: { ...s, site, instagram } });
  await audit({ action: "content.update", actor: actor(me), detail: { section: "site" } });
  revalidateAll();
  redirect("/admin/content?saved=1");
}

/* ---------- users & roles ---------- */

export async function addStaff(fd: FormData) {
  const me = await staff("users");
  if (me.role !== "admin") redirect("/admin");
  const name = str(fd, "name");
  const phone = str(fd, "phone");
  const password = str(fd, "password");
  const role = str(fd, "role") as "manager" | "editor" | "support" | "instructor";
  if (!name || !phone || password.length < 6 || !["manager", "editor", "support", "instructor"].includes(role)) return;
  if (getUserByPhone(phone)) redirect("/admin/users?error=dup");
  const users = getUsers();
  const id = `u-${Date.now().toString(36)}`;
  users.push({
    id,
    name,
    phone,
    passwordHash: hashPassword(password),
    role,
    createdAt: faToday(),
  });
  writeDb({ users });
  await audit({ action: "user.create", level: "security", actor: actor(me), target: `user:${id}`, detail: { role, name } });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUserRole(fd: FormData) {
  const me = await staff("users");
  if (me.role !== "admin") redirect("/admin");
  const id = str(fd, "id");
  const role = str(fd, "role") as "manager" | "editor" | "support" | "instructor" | "student";
  if (id === me.id) redirect("/admin/users"); // can't demote yourself
  const prev = getUserById(id);
  writeDb({ users: getUsers().map((u) => (u.id === id ? { ...u, role } : u)) });
  await audit({ action: "user.role", level: "security", actor: actor(me), target: `user:${id}`, detail: { from: prev?.role, to: role } });
  revalidatePath("/admin/users");
}

/* ---------- security (admin) ---------- */

export async function saveSecuritySettings(fd: FormData) {
  const me = await staff("security");
  const s = getSettings();
  writeDb({
    settings: {
      ...s,
      security: {
        requireStaff2fa: bool(fd, "requireStaff2fa"),
        maxFailedLogins: num(fd, "maxFailedLogins", s.security.maxFailedLogins),
        lockMinutes: num(fd, "lockMinutes", s.security.lockMinutes),
        adminSessionMinutes: num(fd, "adminSessionMinutes", s.security.adminSessionMinutes),
      },
    },
  });
  await audit({ action: "settings.update", level: "security", actor: actor(me), detail: { section: "security", requireStaff2fa: bool(fd, "requireStaff2fa") } });
  revalidatePath("/admin/security");
  redirect("/admin/security?saved=policy");
}

export async function resetUserTotp(fd: FormData) {
  const me = await staff("security");
  if (me.role !== "admin") redirect("/admin");
  const id = str(fd, "id");
  if (id === me.id) return;
  writeDb({
    users: getUsers().map((u) => (u.id === id ? { ...u, totp: undefined } : u)),
    sessions: getSessions().filter((s) => s.userId !== id),
  });
  await audit({ action: "auth.2fa.reset", level: "security", actor: actor(me), target: `user:${id}` });
  revalidatePath("/admin/security");
  redirect("/admin/security?saved=totp");
}

export async function revokeUserSessions(fd: FormData) {
  const me = await staff("security");
  const id = str(fd, "id");
  if (id === me.id) return;
  writeDb({ sessions: getSessions().filter((s) => s.userId !== id) });
  await audit({ action: "auth.logout", level: "security", actor: actor(me), target: `user:${id}`, detail: { forced: true } });
  revalidatePath("/admin/security");
  redirect("/admin/security?saved=sessions");
}

/* ---------- video & DRM settings ---------- */

export async function saveVideoSettings(fd: FormData) {
  const me = await staff("videos");
  const s = getSettings();
  writeDb({
    settings: {
      ...s,
      video: {
        defaults: parseProtection(fd, s.video.defaults),
        signedUrlSeconds: num(fd, "signedUrlSeconds", s.video.signedUrlSeconds),
        transcode: bool(fd, "transcode"),
        ffmpegPath: str(fd, "ffmpegPath") || "auto",
        watermarkExtra: str(fd, "watermarkExtra"),
        watermarkIntervalSec: num(fd, "watermarkIntervalSec", s.video.watermarkIntervalSec),
        playerColor: /^#[0-9a-f]{6}$/i.test(str(fd, "playerColor")) ? str(fd, "playerColor") : s.video.playerColor,
      },
      spotplayer: {
        enabled: bool(fd, "spEnabled"),
        apiKey: str(fd, "spApiKey") || (str(fd, "spKeepKey") === "1" ? s.spotplayer.apiKey : ""),
        test: bool(fd, "spTest"),
        defaultCourseId: str(fd, "spDefaultCourse"),
        devices: {
          all: numAllowZero(fd, "spAll", s.spotplayer.devices.all),
          windows: numAllowZero(fd, "spWin", s.spotplayer.devices.windows),
          mac: numAllowZero(fd, "spMac", s.spotplayer.devices.mac),
          android: numAllowZero(fd, "spAnd", s.spotplayer.devices.android),
          ios: numAllowZero(fd, "spIos", s.spotplayer.devices.ios),
          web: numAllowZero(fd, "spWeb", s.spotplayer.devices.web),
        },
      },
    },
  });
  resetFfmpegCache();
  await audit({ action: "settings.update", level: "security", actor: actor(me), detail: { section: "video+spotplayer" } });
  revalidatePath("/admin/videos");
  redirect("/admin/videos/settings?saved=1");
}

/* ---------- notify settings & broadcast ---------- */

export async function saveSmsSettings(fd: FormData) {
  const me = await staff("settings");
  const s = getSettings();
  writeDb({
    settings: {
      ...s,
      sms: {
        provider: (str(fd, "provider") || "demo") as "demo" | "kavenegar" | "ghasedak",
        apiKey: str(fd, "apiKey"),
        sender: str(fd, "sender"),
      },
    },
  });
  await audit({ action: "settings.update", actor: actor(me), detail: { section: "sms" } });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=sms");
}

export async function saveEmailSettings(fd: FormData) {
  const me = await staff("settings");
  const s = getSettings();
  writeDb({
    settings: {
      ...s,
      email: {
        host: str(fd, "host"),
        port: num(fd, "port", 587),
        user: str(fd, "user"),
        pass: str(fd, "pass"),
        from: str(fd, "from"),
      },
    },
  });
  await audit({ action: "settings.update", actor: actor(me), detail: { section: "email" } });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=email");
}

export async function savePaymentSettings(fd: FormData) {
  const me = await staff("payments");
  const s = getSettings();
  writeDb({
    settings: {
      ...s,
      payment: {
        provider: (str(fd, "provider") || "demo") as "demo" | "zarinpal",
        merchantId: str(fd, "merchantId"),
        sandbox: str(fd, "sandbox") === "on",
      },
    },
  });
  await audit({ action: "settings.update", level: "security", actor: actor(me), detail: { section: "payment" } });
  revalidatePath("/admin/payments");
  redirect("/admin/payments?saved=1");
}

export async function sendBroadcast(fd: FormData) {
  const me = await staff("notify");
  const channel = str(fd, "channel") as "sms" | "email";
  const message = str(fd, "message");
  if (!message) return;
  if (channel === "sms") {
    const audience = str(fd, "audience");
    const to =
      audience === "pending"
        ? getStudents().filter((s) => s.status === "در انتظار پرداخت").map((s) => s.phone)
        : getStudents().map((s) => s.phone);
    const r = await sendSms(to, message);
    await audit({ action: "settings.update", actor: actor(me), detail: { broadcast: "sms", recipients: to.length, ok: r.ok } });
    redirect(`/admin/notify?sent=${r.ok ? "1" : "0"}&detail=${encodeURIComponent(r.detail)}`);
  } else {
    const subs = getSubscribers().map((s) => s.email);
    const r = await sendEmail(subs, str(fd, "subject") || "خبرنامه اسدزاده", `<p>${message}</p>`);
    await audit({ action: "settings.update", actor: actor(me), detail: { broadcast: "email", recipients: subs.length, ok: r.ok } });
    redirect(`/admin/notify?sent=${r.ok ? "1" : "0"}&detail=${encodeURIComponent(r.detail)}`);
  }
}

/* ---------- danger zone ---------- */

export async function resetDemoData() {
  const me = await staff("settings");
  if (me.role !== "admin") redirect("/admin");
  await audit({ action: "db.reset", level: "warn", actor: actor(me) });
  resetDb();
  revalidateAll();
  redirect("/admin/settings?saved=reset");
}
