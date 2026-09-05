import fs from "node:fs";
import path from "node:path";
import type {
  Article,
  Certificate,
  Comment,
  InPersonClass,
  NotifyLog,
  OnlineCourse,
  Order,
  Session,
  Settings,
  Student,
  Subscriber,
  Submission,
  User,
} from "./types";
import { articles as seedArticles, inPersonClasses as seedClasses, onlineCourses as seedCourses } from "./data";
import {
  certificates as seedCertificates,
  comments as seedComments,
  defaultSettings,
  orders as seedOrders,
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
}

function seed(): Db {
  return {
    courses: seedCourses,
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
  };
}

function readDb(): Db {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Db>;
    const base = seed();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
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
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
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

/* ---------- Comments / Submissions ---------- */
export const getComments = (): Comment[] => readDb().comments;
export const getApprovedComments = (scope: "course" | "class", slug: string): Comment[] =>
  readDb().comments.filter((c) => c.scope === scope && c.slug === slug && c.status === "approved");
export const getSubmissions = (): Submission[] => readDb().submissions;

/* ---------- Misc ---------- */
export const getSubscribers = (): Subscriber[] => readDb().subscribers;
export const getNotifyLog = (): NotifyLog[] => readDb().notifyLog;
export const getSettings = (): Settings => readDb().settings;
