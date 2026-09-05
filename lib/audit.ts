import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import type { AuditEntry, AuditLevel, Role } from "./types";
import { getAudit, writeDb } from "./store";

/**
 * Professional audit log for the admin panel.
 *
 * - Every sensitive action (auth, CRUD, settings, uploads, payments, video access)
 *   is appended as a structured entry.
 * - Entries form a SHA-256 hash chain (`prev` → `hash`) so tampering with the
 *   JSON file is detectable (`verifyChain`).
 * - A newline-delimited JSON copy is appended to `data/audit.log` for shipping
 *   to external log systems (Loki/ELK/…); rotation happens at 20 MB.
 * - Secrets are redacted before being stored.
 */

const MAX_IN_DB = 5000;
const LOG_FILE = path.join(process.cwd(), "data", "audit.log");
const ROTATE_BYTES = 20 * 1024 * 1024;
const SECRET_KEYS = /pass|secret|token|apikey|api_key|key$|authorization|cookie|otp|code$/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[…]";
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEYS.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

function hashEntry(e: Omit<AuditEntry, "hash">): string {
  const body = JSON.stringify({
    id: e.id,
    ts: e.ts,
    level: e.level,
    action: e.action,
    actorId: e.actorId,
    target: e.target,
    ip: e.ip,
    detail: e.detail,
    prev: e.prev,
  });
  return crypto.createHash("sha256").update(body).digest("hex");
}

export interface AuditActor {
  id?: string;
  name?: string;
  role?: Role | "anonymous";
}

export interface AuditInput {
  action: string;
  level?: AuditLevel;
  actor?: AuditActor | null;
  target?: string;
  detail?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/** Best-effort request context (works inside server actions / route handlers). */
export async function requestContext(): Promise<{ ip: string; userAgent: string }> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "";
    const ip = fwd.split(",")[0].trim() || "local";
    const userAgent = (h.get("user-agent") ?? "").slice(0, 160);
    return { ip, userAgent };
  } catch {
    return { ip: "system", userAgent: "" };
  }
}

function appendFile(entry: AuditEntry) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    try {
      if (fs.statSync(LOG_FILE).size > ROTATE_BYTES) {
        fs.renameSync(LOG_FILE, `${LOG_FILE}.${Date.now()}`);
      }
    } catch {
      /* no file yet */
    }
    fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, "utf-8");
  } catch {
    /* read-only fs: DB copy is still there */
  }
}

/** Append an audit entry. Never throws. */
export async function audit(input: AuditInput): Promise<AuditEntry | null> {
  try {
    const ctx = input.ip ? { ip: input.ip, userAgent: input.userAgent ?? "" } : await requestContext();
    const list = getAudit();
    const prev = list[0]?.hash ?? "genesis";
    const base: Omit<AuditEntry, "hash"> = {
      id: `log-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`,
      ts: new Date().toISOString(),
      level: input.level ?? "info",
      action: input.action,
      actorId: input.actor?.id,
      actorName: input.actor?.name,
      actorRole: input.actor?.role ?? (input.actor ? undefined : "anonymous"),
      target: input.target,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      detail: input.detail ? (redact(input.detail) as Record<string, unknown>) : undefined,
      prev,
    };
    const entry: AuditEntry = { ...base, hash: hashEntry(base) };
    writeDb({ audit: [entry, ...list].slice(0, MAX_IN_DB) });
    appendFile(entry);
    return entry;
  } catch (e) {
    console.error("[audit] failed", e);
    return null;
  }
}

/** Verify the hash chain integrity of the stored log. */
export function verifyChain(entries: AuditEntry[]): { ok: boolean; brokenAt?: string; checked: number } {
  // entries are newest-first
  const list = [...entries].reverse();
  let prev = "genesis";
  for (const e of list) {
    if (e.prev !== prev) return { ok: false, brokenAt: e.id, checked: list.length };
    const { hash, ...rest } = e;
    if (hashEntry(rest) !== hash) return { ok: false, brokenAt: e.id, checked: list.length };
    prev = hash;
  }
  return { ok: true, checked: list.length };
}

export const auditLevelLabels: Record<AuditLevel, string> = {
  info: "اطلاع",
  warn: "هشدار",
  error: "خطا",
  security: "امنیتی",
};

/** Human labels for common actions (fallback: the raw action). */
export const auditActionLabels: Record<string, string> = {
  "auth.login": "ورود موفق",
  "auth.login.failed": "ورود ناموفق",
  "auth.login.locked": "قفل حساب (تلاش زیاد)",
  "auth.logout": "خروج",
  "auth.register": "ثبت‌نام",
  "auth.2fa.challenge": "درخواست کد دومرحله‌ای",
  "auth.2fa.verified": "تأیید کد دومرحله‌ای",
  "auth.2fa.failed": "کد دومرحله‌ای اشتباه",
  "auth.2fa.enabled": "فعال‌سازی ورود دومرحله‌ای",
  "auth.2fa.disabled": "غیرفعال‌سازی ورود دومرحله‌ای",
  "auth.2fa.recovery": "ورود با کد بازیابی",
  "auth.2fa.reset": "ریست دومرحله‌ای توسط مدیر",
  "admin.denied": "تلاش برای دسترسی غیرمجاز",
  "course.create": "ایجاد دوره",
  "course.update": "ویرایش دوره",
  "course.delete": "حذف دوره",
  "course.lesson.add": "افزودن جلسه",
  "course.lesson.update": "ویرایش جلسه",
  "course.lesson.delete": "حذف جلسه",
  "course.protection": "تغییر تنظیمات امنیت دوره",
  "class.create": "ایجاد کلاس",
  "class.update": "ویرایش کلاس",
  "class.delete": "حذف کلاس",
  "video.upload": "آپلود ویدیو",
  "video.transcode": "پردازش ویدیو",
  "video.delete": "حذف ویدیو",
  "video.play": "پخش ویدیو",
  "video.denied": "درخواست غیرمجاز ویدیو",
  "video.watermark": "ساخت نسخه واترمارک‌دار",
  "spotplayer.license": "صدور لایسنس اسپات‌پلیر",
  "spotplayer.error": "خطای اسپات‌پلیر",
  "instructor.create": "افزودن استاد",
  "instructor.update": "ویرایش استاد",
  "instructor.delete": "حذف استاد",
  "product.create": "ایجاد محصول",
  "product.update": "ویرایش محصول",
  "product.delete": "حذف محصول",
  "product.stock": "تغییر موجودی",
  "preorder.create": "ثبت پیش‌سفارش",
  "preorder.update": "به‌روزرسانی پیش‌سفارش",
  "order.create": "ثبت سفارش",
  "order.status": "تغییر وضعیت سفارش",
  "order.paid": "پرداخت موفق",
  "order.failed": "پرداخت ناموفق",
  "settings.update": "تغییر تنظیمات",
  "user.create": "افزودن کاربر",
  "user.role": "تغییر نقش کاربر",
  "media.upload": "آپلود تصویر",
  "media.delete": "حذف تصویر",
  "content.update": "ویرایش محتوای سایت",
  "certificate.issue": "صدور گواهی",
  "certificate.delete": "حذف گواهی",
  "db.reset": "ریست داده نمایشی",
  "audit.export": "خروجی گرفتن از لاگ",
};
