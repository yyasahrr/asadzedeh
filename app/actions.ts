"use server";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { faToday } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";
import { sendEmail } from "@/lib/notify";
import {
  getComments,
  getSubmissions,
  getSubscribers,
  writeDb,
} from "@/lib/store";

/* ---------- newsletter ---------- */

export async function subscribeNewsletter(
  _prev: { ok: boolean; message: string } | null,
  fd: FormData
): Promise<{ ok: boolean; message: string }> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "ایمیل معتبر نیست." };
  }
  const subs = getSubscribers();
  if (subs.some((s) => s.email === email)) {
    return { ok: true, message: "شما قبلاً عضو خبرنامه بودید." };
  }
  subs.unshift({ email, date: faToday() });
  writeDb({ subscribers: subs });
  await sendEmail([email], "به خبرنامه اسدزاده خوش آمدید", "<p>عضویت شما ثبت شد. هر هفته از ما می‌شنوید.</p>");
  return { ok: true, message: "عضویت شما در خبرنامه ثبت شد." };
}

/* ---------- course/class Q&A ---------- */

export async function submitComment(fd: FormData) {
  const scope = String(fd.get("scope") ?? "course") as "course" | "class";
  const slug = String(fd.get("slug") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const text = String(fd.get("text") ?? "").trim();
  if (!slug || !name || !text) return;

  // Validate that scope and slug refer to real resources
  if (scope !== "course" && scope !== "class") return;

  const comments = getComments();
  comments.unshift({
    id: `cm-${Date.now().toString(36)}`,
    scope,
    slug,
    name: name.slice(0, 60),
    text: text.slice(0, 1000),
    date: faToday(),
    status: "pending",
  });
  writeDb({ comments });
  const base = scope === "course" ? "/courses" : "/classes";
  revalidatePath(`${base}/${slug}`);
  redirect(`${base}/${slug}?comment=sent#comments`);
}

/* ---------- assignment upload ---------- */

/** Private storage for assignments — not under public/ */
const ASSIGN_DIR = path.join(process.cwd(), "data", "assignments");
const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf", "application/zip", "application/x-zip-compressed"];
const MAX_SIZE = 10 * 1024 * 1024;

export async function submitAssignment(fd: FormData) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth?next=/dashboard/assignments");
  }

  const assignment = String(fd.get("assignment") ?? "").trim();
  const course = String(fd.get("course") ?? "").trim();
  const file = fd.get("file");

  if (!assignment || !(file instanceof File) || file.size === 0) {
    redirect("/dashboard/assignments?error=empty");
  }

  // Validate MIME type and extension
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExtensions = ["png", "jpg", "jpeg", "webp", "pdf", "zip"];
  if (!OK_TYPES.includes(file.type) && !allowedExtensions.includes(ext)) {
    redirect("/dashboard/assignments?error=type");
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    redirect("/dashboard/assignments?error=size");
  }

  // Generate safe random filename (no user-controlled input in path)
  const safeExt = allowedExtensions.includes(ext) ? ext : "bin";
  const randomName = `${crypto.randomBytes(16).toString("hex")}.${safeExt}`;

  fs.mkdirSync(ASSIGN_DIR, { recursive: true });
  fs.writeFileSync(path.join(ASSIGN_DIR, randomName), Buffer.from(await file.arrayBuffer()));

  const student = user.name;
  const rest = getSubmissions().filter((s) => !(s.assignment === assignment && s.student === student));
  rest.unshift({
    id: `sub-${Date.now().toString(36)}`,
    assignment,
    course,
    student,
    userId: user.id,
    file: randomName,
    date: faToday(),
    status: "در حال بررسی",
  });
  writeDb({ submissions: rest });
  revalidatePath("/dashboard/assignments");
  redirect("/dashboard/assignments?sent=1");
}
