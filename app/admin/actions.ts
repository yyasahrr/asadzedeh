"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { faToday, parsePrice } from "@/lib/format";
import { can, getSessionUser, hashPassword, type Permission, type SessionUser } from "@/lib/auth";
import { sendEmail, sendSms } from "@/lib/notify";
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
  getOrders,
  getSettings,
  getStudents,
  getSubmissions,
  getSubscribers,
  getUsers,
  getUserByPhone,
  resetDb,
  writeDb,
} from "@/lib/store";

/* ---------- helpers ---------- */

async function staff(perm: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!can(user, perm)) redirect("/admin");
  return user as SessionUser;
}

function str(fd: FormData, key: string, fallback = ""): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : fallback;
}

function num(fd: FormData, key: string, fallback = 0): number {
  const n = Number(str(fd, key).replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
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

function revalidateAll() {
  ["/", "/courses", "/classes", "/blog", "/paths", "/admin", "/dashboard"].forEach((p) =>
    revalidatePath(p, "page")
  );
}

/* ---------- courses ---------- */

export async function createCourse(fd: FormData) {
  await staff("courses");
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
  await staff("courses");
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
  await staff("courses");
  const slug = str(fd, "slug");
  writeDb({ courses: getCourses().filter((c) => c.slug !== slug) });
  revalidateAll();
  redirect("/admin/courses");
}

/* ---------- classes ---------- */

export async function createClass(fd: FormData) {
  await staff("classes");
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
  await staff("classes");
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
  await staff("classes");
  const slug = str(fd, "slug");
  writeDb({ classes: getClasses().filter((c) => c.slug !== slug) });
  revalidateAll();
  redirect("/admin/classes");
}

/* ---------- students ---------- */

export async function addStudent(fd: FormData) {
  await staff("students");
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
  revalidatePath("/admin/students");
  redirect("/admin/students");
}

export async function deleteStudent(fd: FormData) {
  await staff("students");
  const phone = str(fd, "phone");
  writeDb({ students: getStudents().filter((s) => s.phone !== phone) });
  revalidatePath("/admin/students");
  redirect("/admin/students");
}

/* ---------- orders ---------- */

export async function updateOrderStatus(fd: FormData) {
  await staff("orders");
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!id || !status) return;
  writeDb({ orders: getOrders().map((o) => (o.id === id ? { ...o, status } : o)) });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

/* ---------- certificates ---------- */

export async function issueCertificate(fd: FormData) {
  await staff("certificates");
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
  revalidatePath("/admin/certificates");
  redirect("/admin/certificates");
}

export async function deleteCertificate(fd: FormData) {
  await staff("certificates");
  const code = str(fd, "code");
  writeDb({ certificates: getCertificates().filter((c) => c.code !== code) });
  revalidatePath("/admin/certificates");
  redirect("/admin/certificates");
}

/* ---------- articles ---------- */

export async function createArticle(fd: FormData) {
  await staff("blog");
  const title = str(fd, "title");
  if (!title) return;
  const articles = getArticles();
  articles.unshift({
    slug: uniqueSlug(newSlug("a"), (s) => articles.some((a) => a.slug === s)),
    title,
    category: str(fd, "category") || "دانشنامه",
    excerpt: str(fd, "excerpt"),
    minutes: num(fd, "minutes", 5),
    date: faToday(),
    image: str(fd, "image") || "/images/course-carpet.jpg",
    body: paragraphs(str(fd, "body")),
  });
  writeDb({ articles });
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function updateArticle(fd: FormData) {
  await staff("blog");
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
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  redirect("/admin/blog");
}

export async function deleteArticle(fd: FormData) {
  await staff("blog");
  const slug = str(fd, "slug");
  writeDb({ articles: getArticles().filter((a) => a.slug !== slug) });
  revalidatePath("/blog");
  redirect("/admin/blog");
}

/* ---------- comments ---------- */

export async function approveComment(fd: FormData) {
  await staff("comments");
  const id = str(fd, "id");
  writeDb({ comments: getComments().map((c) => (c.id === id ? { ...c, status: "approved" as const } : c)) });
  revalidateAll();
  redirect("/admin/comments");
}

export async function deleteComment(fd: FormData) {
  await staff("comments");
  const id = str(fd, "id");
  writeDb({ comments: getComments().filter((c) => c.id !== id) });
  revalidateAll();
  redirect("/admin/comments");
}

/* ---------- submissions ---------- */

export async function reviewSubmission(fd: FormData) {
  await staff("submissions");
  const id = str(fd, "id");
  const status = str(fd, "status") as "تأیید شده" | "نیاز به اصلاح" | "در حال بررسی";
  const note = str(fd, "note");
  writeDb({
    submissions: getSubmissions().map((s) =>
      s.id === id ? { ...s, status, note: note || s.note } : s
    ),
  });
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
  if (!can(user, "media") && !can(user, "content") && !can(user, "blog")) {
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
  revalidatePath("/admin/media");
  return { ok: true, path: `/uploads/${name}` };
}

export async function deleteMedia(fd: FormData) {
  await staff("media");
  const p = str(fd, "path");
  if (!p.startsWith("/uploads/") || p.includes("..")) return;
  try {
    fs.unlinkSync(path.join(process.cwd(), "public", p));
  } catch {
    /* already gone */
  }
  revalidatePath("/admin/media");
  redirect("/admin/media");
}

/* ---------- site content (CMS) ---------- */

export async function saveSiteContent(fd: FormData) {
  await staff("content");
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
  writeDb({ settings: { ...s, site } });
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
  const role = str(fd, "role") as "manager" | "editor" | "support";
  if (!name || !phone || password.length < 6 || !["manager", "editor", "support"].includes(role)) return;
  if (getUserByPhone(phone)) redirect("/admin/users?error=dup");
  const users = getUsers();
  users.push({
    id: `u-${Date.now().toString(36)}`,
    name,
    phone,
    passwordHash: hashPassword(password),
    role,
    createdAt: faToday(),
  });
  writeDb({ users });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUserRole(fd: FormData) {
  const me = await staff("users");
  if (me.role !== "admin") redirect("/admin");
  const id = str(fd, "id");
  const role = str(fd, "role") as "manager" | "editor" | "support" | "student";
  if (id === me.id) redirect("/admin/users"); // can't demote yourself
  writeDb({ users: getUsers().map((u) => (u.id === id ? { ...u, role } : u)) });
  revalidatePath("/admin/users");
}

/* ---------- notify settings & broadcast ---------- */

export async function saveSmsSettings(fd: FormData) {
  await staff("settings");
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
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=sms");
}

export async function saveEmailSettings(fd: FormData) {
  await staff("settings");
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
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=email");
}

export async function savePaymentSettings(fd: FormData) {
  await staff("payments");
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
  revalidatePath("/admin/payments");
  redirect("/admin/payments?saved=1");
}

export async function sendBroadcast(fd: FormData) {
  await staff("notify");
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
    redirect(`/admin/notify?sent=${r.ok ? "1" : "0"}&detail=${encodeURIComponent(r.detail)}`);
  } else {
    const subs = getSubscribers().map((s) => s.email);
    const r = await sendEmail(subs, str(fd, "subject") || "خبرنامه اسدزاده", `<p>${message}</p>`);
    redirect(`/admin/notify?sent=${r.ok ? "1" : "0"}&detail=${encodeURIComponent(r.detail)}`);
  }
}

/* ---------- danger zone ---------- */

export async function resetDemoData() {
  const me = await staff("settings");
  if (me.role !== "admin") redirect("/admin");
  resetDb();
  revalidateAll();
  redirect("/admin/settings?saved=reset");
}
