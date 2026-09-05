import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { Role, User } from "./types";
import { getSession, getUserById } from "./store";

export const SESSION_COOKIE = "az_session";

/* ---------- password hashing (scrypt, no deps) ---------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function newToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/* ---------- session ---------- */

export type SessionUser = Omit<User, "passwordHash">;

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = getSession(token);
  if (!session) return null;
  const user = getUserById(session.userId);
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

export function isStaff(user: SessionUser | null): boolean {
  return !!user && user.role !== "student";
}

/* ---------- permissions ---------- */

export type Permission =
  | "courses"
  | "classes"
  | "blog"
  | "content"
  | "media"
  | "comments"
  | "students"
  | "orders"
  | "submissions"
  | "certificates"
  | "users"
  | "notify"
  | "payments"
  | "settings";

const ROLE_PERMS: Record<Role, Permission[]> = {
  admin: [
    "courses", "classes", "blog", "content", "media", "comments",
    "students", "orders", "submissions", "certificates",
    "users", "notify", "payments", "settings",
  ],
  manager: [
    "courses", "classes", "blog", "content", "media", "comments",
    "students", "orders", "submissions", "certificates", "notify", "payments",
  ],
  editor: ["blog", "content", "media", "comments", "courses", "classes"],
  support: ["students", "orders", "submissions", "certificates", "comments"],
  student: [],
};

export function can(user: SessionUser | null, perm: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMS[user.role].includes(perm);
}

export const roleLabels: Record<Role, string> = {
  admin: "مدیر کل",
  manager: "مدیر",
  editor: "ویراستار",
  support: "پشتیبانی",
  student: "هنرجو",
};
