"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parsePrice } from "@/lib/format";
import {
  getCertificate,
  getCertificates,
  getClass,
  getClasses,
  getCourse,
  getCourses,
  getOrders,
  getStudents,
  writeDb,
} from "@/lib/store";

/* ---------- helpers ---------- */

function str(fd: FormData, key: string, fallback = ""): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : fallback;
}

function num(fd: FormData, key: string, fallback = 0): number {
  const n = Number(str(fd, key).replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
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

function revalidateAll() {
  ["", "/courses", "/classes", "/paths", "/admin", "/dashboard"].forEach((p) =>
    revalidatePath(p === "" ? "/" : p, "page")
  );
}

/* ---------- courses ---------- */

export async function createCourse(fd: FormData) {
  const title = str(fd, "title");
  if (!title) return;
  const syllabus = lines(str(fd, "syllabus")).map((line) => {
    const [t, rest] = line.split(":");
    return {
      title: (t ?? line).trim(),
      lessons: rest ? rest.split(/[؛;]/).map((l) => l.trim()).filter(Boolean) : [],
    };
  });
  const courses = getCourses();
  courses.unshift({
    slug: uniqueSlug(newSlug("c"), (s) => courses.some((c) => c.slug === s)),
    title,
    shortTitle: str(fd, "shortTitle") || title,
    category: str(fd, "category") || "فرش‌بافی",
    instructor: str(fd, "instructor") || "استاد رضا اسدزاده",
    instructorRole: "مدرس اسدزاده",
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
  });
  writeDb({ courses });
  revalidateAll();
  redirect("/admin/courses");
}

export async function updateCourse(fd: FormData) {
  const slug = str(fd, "slug");
  const prev = getCourse(slug);
  if (!prev) return;
  const syllabus = lines(str(fd, "syllabus")).map((line) => {
    const [t, rest] = line.split(":");
    return {
      title: (t ?? line).trim(),
      lessons: rest ? rest.split(/[؛;]/).map((l) => l.trim()).filter(Boolean) : [],
    };
  });
  const courses = getCourses().map((c) =>
    c.slug === slug
      ? {
          ...c,
          title: str(fd, "title") || c.title,
          shortTitle: str(fd, "shortTitle") || c.shortTitle,
          category: str(fd, "category") || c.category,
          instructor: str(fd, "instructor") || c.instructor,
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
        }
      : c
  );
  writeDb({ courses });
  revalidateAll();
  redirect("/admin/courses");
}

export async function deleteCourse(fd: FormData) {
  const slug = str(fd, "slug");
  writeDb({ courses: getCourses().filter((c) => c.slug !== slug) });
  revalidateAll();
  redirect("/admin/courses");
}

/* ---------- classes ---------- */

export async function createClass(fd: FormData) {
  const title = str(fd, "title");
  if (!title) return;
  const capacity = num(fd, "capacity", 10);
  const classes = getClasses();
  classes.unshift({
    slug: uniqueSlug(newSlug("k"), (s) => classes.some((c) => c.slug === s)),
    title,
    instructor: str(fd, "instructor") || "استاد رضا اسدزاده",
    startDate: str(fd, "startDate"),
    days: str(fd, "days"),
    time: str(fd, "time"),
    sessions: num(fd, "sessions", 8),
    capacity,
    remaining: capacity,
    location: str(fd, "location") || "کارگاه اسدزاده، تهران",
    price: parsePrice(str(fd, "price")),
    image: str(fd, "image") || "/images/workshop-loom.jpg",
    excerpt: str(fd, "excerpt"),
    includes: lines(str(fd, "includes")),
  });
  writeDb({ classes });
  revalidateAll();
  redirect("/admin/classes");
}

export async function updateClass(fd: FormData) {
  const slug = str(fd, "slug");
  const prev = getClass(slug);
  if (!prev) return;
  const capacity = num(fd, "capacity", prev.capacity);
  const classes = getClasses().map((c) =>
    c.slug === slug
      ? {
          ...c,
          title: str(fd, "title") || c.title,
          instructor: str(fd, "instructor") || c.instructor,
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
        }
      : c
  );
  writeDb({ classes });
  revalidateAll();
  redirect("/admin/classes");
}

export async function deleteClass(fd: FormData) {
  const slug = str(fd, "slug");
  writeDb({ classes: getClasses().filter((c) => c.slug !== slug) });
  revalidateAll();
  redirect("/admin/classes");
}

/* ---------- students ---------- */

export async function addStudent(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  const students = getStudents();
  students.unshift({
    name,
    phone: str(fd, "phone"),
    courses: num(fd, "courses", 1),
    joinDate: str(fd, "joinDate") || "شهریور ۱۴۰۵",
    status: str(fd, "status") || "فعال",
  });
  writeDb({ students });
  revalidatePath("/admin/students");
  redirect("/admin/students");
}

export async function deleteStudent(fd: FormData) {
  const phone = str(fd, "phone");
  writeDb({ students: getStudents().filter((s) => s.phone !== phone) });
  revalidatePath("/admin/students");
  redirect("/admin/students");
}

/* ---------- orders ---------- */

export async function updateOrderStatus(fd: FormData) {
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!id || !status) return;
  writeDb({ orders: getOrders().map((o) => (o.id === id ? { ...o, status } : o)) });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

/* ---------- certificates ---------- */

export async function issueCertificate(fd: FormData) {
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
    date: str(fd, "date") || "شهریور ۱۴۰۵",
    hours: num(fd, "hours", 12),
  });
  writeDb({ certificates: certs });
  revalidatePath("/admin/certificates");
  redirect("/admin/certificates");
}

export async function deleteCertificate(fd: FormData) {
  const code = str(fd, "code");
  writeDb({ certificates: getCertificates().filter((c) => c.code !== code) });
  revalidatePath("/admin/certificates");
  redirect("/admin/certificates");
}
