import fs from "node:fs";
import path from "node:path";
import type {
  Article,
  AuditEntry,
  Certificate,
  Comment,
  Enrollment,
  InPersonClass,
  Instructor,
  NotifyLog,
  OnlineCourse,
  Order,
  Preorder,
  Product,
  Session,
  Settings,
  Student,
  Subscriber,
  Submission,
  User,
  VideoAsset,
} from "./types";
import {
  articles as seedArticles,
  inPersonClasses as seedClasses,
  instructors as seedInstructors,
  onlineCourses as seedCourses,
} from "./data";
import {
  certificates as seedCertificates,
  comments as seedComments,
  defaultSettings,
  enrollments as seedEnrollments,
  orders as seedOrders,
  products as seedProducts,
  students as seedStudents,
  users as seedUsers,
} from "./seed";

/**
 * File-backed demo store (server-only).
 * Reads/writes `data/db.json`; seeds on first run.
 * Swap these functions with real DB calls when going to production.
 */

const DB_PATH = path.join(process.cwd(), "data", "db.json");

export interface Db {
  courses: OnlineCourse[];
  classes: InPersonClass[];
  students: Student[];
  orders: Order[];
  certificates: Certificate[];
  articles: Article[];
  users: User[];
  sessions: Session[];
  comments: Comment[];
  submissions: Submission[];
  subscribers: Subscriber[];
  notifyLog: NotifyLog[];
  settings: Settings;
  /* --- new collections --- */
  instructors: Instructor[];
  videos: VideoAsset[];
  enrollments: Enrollment[];
  products: Product[];
  preorders: Preorder[];
  audit: AuditEntry[];
}

/**
 * Seed courses ship with a textual syllabus only. Derive a lesson skeleton from it
 * (first lesson of each course is a free preview) so the player, progress tracking
 * and admin lesson manager have real rows to work with. Videos are attached later
 * from /admin/courses/[slug]/lessons.
 */
function withSeedLessons(course: OnlineCourse): OnlineCourse {
  if (course.lessons && course.lessons.length > 0) return course;
  let order = 0;
  const chapters = course.syllabus.map((s, i) => ({
    id: `ch-${course.slug}-${i + 1}`,
    title: s.title,
    order: i + 1,
  }));
  const chapterIdByTitle = new Map(chapters.map((ch) => [ch.title, ch.id]));
  const lessons = course.syllabus.flatMap((chapter) =>
    chapter.lessons.map((title) => {
      order += 1;
      return {
        id: `ls-${course.slug}-${order}`,
        title,
        chapterId: chapterIdByTitle.get(chapter.title) ?? chapters[0]?.id ?? "",
        order,
        durationMin: 18 + ((order * 7) % 25),
        free: order === 1,
      };
    })
  );
  return { ...course, chapters, lessons };
}

function seed(): Db {
  return {
    courses: seedCourses.map(withSeedLessons),
    classes: seedClasses,
    students: seedStudents,
    orders: seedOrders,
    certificates: seedCertificates,
    articles: seedArticles,
    users: seedUsers,
    sessions: [],
    comments: seedComments,
    submissions: [],
    subscribers: [],
    notifyLog: [],
    settings: defaultSettings,
    instructors: seedInstructors,
    videos: [],
    enrollments: seedEnrollments,
    products: seedProducts,
    preorders: [],
    audit: [],
  };
}

/** Deep-merge settings so newly added setting groups get defaults on old DB files. */
function mergeSettings(base: Settings, parsed: Partial<Settings> | undefined): Settings {
  if (!parsed) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof Settings)[]) {
    const b = base[key] as unknown;
    const p = parsed[key] as unknown;
    if (p && typeof p === "object" && !Array.isArray(p) && b && typeof b === "object" && !Array.isArray(b)) {
      out[key] = { ...(b as object), ...(p as object) };
    } else if (p !== undefined) {
      out[key] = p;
    }
  }
  return out as unknown as Settings;
}

/** Make sure seed users that were added later (e.g. instructor demo) exist. */
function ensureSeedUsers(users: User[]): User[] {
  const known = new Set(users.map((u) => u.id));
  const missing = seedUsers.filter((u) => !known.has(u.id) && !users.some((x) => x.phone === u.phone));
  return missing.length > 0 ? [...users, ...missing] : users;
}

function readDb(): Db {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Db>;
    const base = seed();
    return {
      ...base,
      ...parsed,
      users: ensureSeedUsers(parsed.users ?? base.users),
      settings: mergeSettings(base.settings, parsed.settings),
    };
  } catch {
    const db = seed();
    try {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    } catch {
      /* read-only environment: fall back to seed in memory */
    }
    return db;
  }
}

export function writeDb(patch: Partial<Db>): Db {
  const db: Db = { ...readDb(), ...patch };
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf-8");
  fs.renameSync(tmp, DB_PATH);
  return db;
}

export function resetDb(): Db {
  try {
    fs.unlinkSync(DB_PATH);
  } catch {
    /* already gone */
  }
  return readDb();
}

/* ---------- Courses / Classes ---------- */
export const getCourses = (): OnlineCourse[] => readDb().courses;
export const getCourse = (slug: string): OnlineCourse | undefined =>
  readDb().courses.find((c) => c.slug === slug);
export const getClasses = (): InPersonClass[] => readDb().classes;
export const getClass = (slug: string): InPersonClass | undefined =>
  readDb().classes.find((c) => c.slug === slug);

/* ---------- Instructors ---------- */
export const getInstructors = (): Instructor[] => readDb().instructors;
export const getInstructor = (slug: string): Instructor | undefined =>
  readDb().instructors.find((i) => i.slug === slug);
export const getInstructorByUser = (userId: string): Instructor | undefined =>
  readDb().instructors.find((i) => i.userId === userId);

/* ---------- Students / Orders ---------- */
export const getStudents = (): Student[] => readDb().students;
export const getOrders = (): Order[] => readDb().orders;
export const getOrder = (id: string): Order | undefined =>
  readDb().orders.find((o) => o.id === id);

/* ---------- Certificates ---------- */
export const getCertificates = (): Certificate[] => readDb().certificates;
export const getCertificate = (code: string): Certificate | undefined =>
  readDb().certificates.find((c) => c.code.toLowerCase() === code.toLowerCase());
export const getCertificatesByStudent = (student: string): Certificate[] =>
  readDb().certificates.filter((c) => c.student === student);

/* ---------- Articles ---------- */
export const getArticles = (): Article[] => readDb().articles;
export const getArticle = (slug: string): Article | undefined =>
  readDb().articles.find((a) => a.slug === slug);

/* ---------- Users / Sessions ---------- */
export const getUsers = (): User[] => readDb().users;
export const getUserByPhone = (phone: string): User | undefined =>
  readDb().users.find((u) => u.phone === phone);
export const getUserById = (id: string): User | undefined =>
  readDb().users.find((u) => u.id === id);
export const getSession = (token: string): Session | undefined =>
  readDb().sessions.find((s) => s.token === token);
export const getSessions = (): Session[] => readDb().sessions;

/* ---------- Comments / Submissions ---------- */
export const getComments = (): Comment[] => readDb().comments;
export const getApprovedComments = (scope: "course" | "class", slug: string): Comment[] =>
  readDb().comments.filter((c) => c.scope === scope && c.slug === slug && c.status === "approved");
export const getSubmissions = (): Submission[] => readDb().submissions;

/* ---------- Videos / Enrollments ---------- */
export const getVideos = (): VideoAsset[] => readDb().videos;
export const getVideo = (id: string): VideoAsset | undefined =>
  readDb().videos.find((v) => v.id === id);
export const getEnrollments = (): Enrollment[] => readDb().enrollments;
export const getEnrollmentsByUser = (userId: string): Enrollment[] =>
  readDb().enrollments.filter((e) => e.userId === userId);
export const getEnrollment = (userId: string, courseSlug: string): Enrollment | undefined =>
  readDb().enrollments.find((e) => e.userId === userId && e.courseSlug === courseSlug);

/* ---------- Shop ---------- */
export const getProducts = (): Product[] => readDb().products;
export const getActiveProducts = (): Product[] => readDb().products.filter((p) => p.active);
export const getProduct = (slug: string): Product | undefined =>
  readDb().products.find((p) => p.slug === slug);
export const getPreorders = (): Preorder[] => readDb().preorders;
export const getPreorder = (id: string): Preorder | undefined =>
  readDb().preorders.find((p) => p.id === id);

/* ---------- Audit ---------- */
export const getAudit = (): AuditEntry[] => readDb().audit;

/* ---------- Misc ---------- */
export const getSubscribers = (): Subscriber[] => readDb().subscribers;
export const getNotifyLog = (): NotifyLog[] => readDb().notifyLog;
export const getSettings = (): Settings => readDb().settings;
