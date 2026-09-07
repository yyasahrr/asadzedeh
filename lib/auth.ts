import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { Role, Session, User } from "./types";
import { isProduction } from "./env";
import { getSession, getSettings, getUserById } from "./store";

export const SESSION_COOKIE = "az_session";
/** Short-lived cookie used between password step and TOTP step. */
export const MFA_COOKIE = "az_mfa";

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

export type SessionUser = Omit<User, "passwordHash" | "totp"> & {
  /** true when the user has TOTP enabled */
  totpEnabled: boolean;
  /** true when this session has passed the second factor */
  mfaVerified: boolean;
  sessionToken: string;
};

export function toSafeUser(user: User, session?: Session | null): SessionUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, totp, ...safe } = user;
  return {
    ...safe,
    totpEnabled: !!totp?.enabled,
    mfaVerified: !!session?.mfaVerified,
    sessionToken: session?.token ?? "",
  };
}

/** Hard ceiling for any session, in milliseconds. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Server-side session validity.
 *
 * A session is rejected when it is revoked, when it has passed `expiresAt`, or
 * when no expiry can be established at all. Browser cookie expiry is never
 * relied on — every protected request goes through this.
 */
export function sessionState(
  session: Session | undefined | null,
  now: number = Date.now(),
): "active" | "unknown" | "revoked" | "expired" {
  if (!session) return "unknown";
  if (session.revokedAt) return "revoked";
  const expiresAt =
    session.expiresAt ??
    (session.lastSeen ? new Date(Date.parse(session.lastSeen) + SESSION_TTL_MS).toISOString() : undefined);
  if (!expiresAt) return "expired";
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts) || ts <= now) return "expired";
  return "active";
}

export function isSessionActive(session: Session | undefined | null, now?: number): boolean {
  return sessionState(session, now) === "active";
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = getSession(token);
  if (!isSessionActive(session)) return null;
  const user = getUserById(session!.userId);
  if (!user) return null;
  return toSafeUser(user, session);
}

export function isStaff(user: SessionUser | null): boolean {
  return !!user && user.role !== "student";
}

export function isInstructor(user: SessionUser | null): boolean {
  return !!user && user.role === "instructor";
}

/**
 * Whether the site policy requires 2FA for staff.
 *
 * In production this is always true. The admin-toggleable setting is a
 * convenience for staging and local development; letting a production deployment
 * run with staff 2FA switched off would mean a single leaked password hands over
 * the admin panel. Same reasoning as `demoPaymentAllowed()`: the unsafe mode is
 * opt-in outside production and unavailable inside it.
 */
export function staffMfaRequired(): boolean {
  if (isProduction()) return true;
  return getSettings().security.requireStaff2fa;
}

/**
 * Staff need a verified second factor when:
 *  - they have TOTP enabled on their account, or
 *  - the site policy requires 2FA for all staff (then they must enrol).
 *
 * Instructors are exempt from the *enrolment* requirement — they are content
 * authors rather than administrators — but an instructor who has enabled TOTP is
 * still held to it.
 */
export function needsMfa(user: SessionUser | null): "none" | "verify" | "enrol" {
  if (!user || !isStaff(user)) return "none";
  if (user.totpEnabled) return user.mfaVerified ? "none" : "verify";
  return staffMfaRequired() && user.role !== "instructor" ? "enrol" : "none";
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
  | "settings"
  | "videos"
  | "instructors"
  | "shop"
  | "preorders"
  | "audit"
  | "security"
  | "support"
  | "seo";

const STAFF_ALL: Permission[] = [
  "courses", "classes", "blog", "content", "media", "comments",
  "students", "orders", "submissions", "certificates",
  "users", "notify", "payments", "settings",
  "videos", "instructors", "shop", "preorders", "audit", "security",
  "support", "seo",
];

const ROLE_PERMS: Record<Role, Permission[]> = {
  super_admin: STAFF_ALL,
  admin: STAFF_ALL,
  manager: [
    "courses", "classes", "blog", "content", "media", "comments",
    "students", "orders", "submissions", "certificates", "notify", "payments",
    "videos", "instructors", "shop", "preorders", "audit",
    "support", "seo",
  ],
  editor: ["blog", "content", "media", "comments", "courses", "classes", "videos", "shop", "seo"],
  support: ["students", "orders", "submissions", "certificates", "comments", "preorders", "support"],
  /** Instructors use their own panel (/instructor); no admin permissions. */
  instructor: [],
  student: [],
};

export function can(user: SessionUser | null, perm: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMS[user.role].includes(perm);
}

export const roleLabels: Record<Role, string> = {
  super_admin: "مدیر ارشد",
  admin: "مدیر کل",
  manager: "مدیر",
  editor: "ویراستار",
  support: "پشتیبانی",
  instructor: "استاد",
  student: "هنرجو",
};

export function isSuperAdmin(user: SessionUser | null): boolean {
  return !!user && (user.role === "super_admin" || user.role === "admin");
}

/* ---------- signed URLs for protected video delivery ---------- */

const SIGN_SECRET = () => {
  const secret = process.env.APP_SECRET || process.env.VIDEO_SIGNING_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET is required in production. Generate one with: openssl rand -hex 32");
  }
  return secret || "asadzedeh-dev-signing-secret-change-me";
};

export function signPayload(payload: Record<string, string | number>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SIGN_SECRET()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySigned<T extends Record<string, unknown>>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", SIGN_SECRET()).update(body).digest("base64url");
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp?: number };
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}
