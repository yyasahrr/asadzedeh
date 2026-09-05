import fs from "node:fs";
import path from "node:path";
import type {
  Certificate,
  InPersonClass,
  OnlineCourse,
  Order,
  Student,
} from "./types";
import { inPersonClasses as seedClasses, onlineCourses as seedCourses } from "./data";
import {
  certificates as seedCertificates,
  orders as seedOrders,
  students as seedStudents,
} from "./seed";

/**
 * File-backed demo store (server-only).
 * Reads/writes `data/db.json`; seeds from lib/data.ts on first run.
 * Swap these functions with real DB calls when going to production.
 */

const DB_PATH = path.join(process.cwd(), "data", "db.json");

export interface Db {
  courses: OnlineCourse[];
  classes: InPersonClass[];
  students: Student[];
  orders: Order[];
  certificates: Certificate[];
}

function seed(): Db {
  return {
    courses: seedCourses,
    classes: seedClasses,
    students: seedStudents,
    orders: seedOrders,
    certificates: seedCertificates,
  };
}

function readDb(): Db {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return { ...seed(), ...(JSON.parse(raw) as Partial<Db>) };
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

/* ---------- Courses ---------- */
export const getCourses = (): OnlineCourse[] => readDb().courses;
export const getCourse = (slug: string): OnlineCourse | undefined =>
  readDb().courses.find((c) => c.slug === slug);

/* ---------- Classes ---------- */
export const getClasses = (): InPersonClass[] => readDb().classes;
export const getClass = (slug: string): InPersonClass | undefined =>
  readDb().classes.find((c) => c.slug === slug);

/* ---------- Students / Orders ---------- */
export const getStudents = (): Student[] => readDb().students;
export const getOrders = (): Order[] => readDb().orders;

/* ---------- Certificates ---------- */
export const getCertificates = (): Certificate[] => readDb().certificates;
export const getCertificate = (code: string): Certificate | undefined =>
  readDb().certificates.find((c) => c.code.toLowerCase() === code.toLowerCase());
export const getCertificatesByStudent = (student: string): Certificate[] =>
  readDb().certificates.filter((c) => c.student === student);
