import "server-only";
import crypto from "node:crypto";
import { getSql } from "./db/client";
import { normalizeDigits } from "./format";
import { syncCollections } from "./store";
import type { User } from "./types";

export function normalizeIranianMobile(raw: string): string | null {
  let phone = normalizeDigits(raw.trim()).replace(/[\s()-]/g, "");
  if (phone.startsWith("+98")) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith("0098")) phone = `0${phone.slice(4)}`;
  else if (phone.startsWith("98") && phone.length === 12) phone = `0${phone.slice(2)}`;
  return /^09\d{9}$/.test(phone) ? phone : null;
}

export async function getStudentAccountDetail(id: string) {
  const sql = await getSql();
  const users = await sql.query<{ payload: User }>("SELECT payload FROM users WHERE id=$1 AND role='student'", [id]);
  if (!users[0]) return null;
  const [sessions, enrollments, orders, payments, certificates, tickets, submissions] = await Promise.all([
    sql.query<Record<string, unknown>>("SELECT token,created_at,last_seen,expires_at,payload FROM sessions WHERE user_id=$1 ORDER BY COALESCE(last_seen,created_at) DESC", [id]),
    sql.query<Record<string, unknown>>("SELECT id,course_slug,order_id,created_at,payload FROM enrollments WHERE user_id=$1 ORDER BY created_at DESC", [id]),
    sql.query<Record<string, unknown>>("SELECT id,status,amount,created_at,payload FROM orders WHERE user_id=$1 ORDER BY created_at DESC", [id]),
    sql.query<Record<string, unknown>>("SELECT p.id,p.status,p.amount,p.provider,p.created_at,p.verified_at,p.gateway_transaction_id FROM payments p JOIN orders o ON o.id=p.order_id WHERE o.user_id=$1 ORDER BY p.created_at DESC", [id]),
    sql.query<Record<string, unknown>>("SELECT code,student_name,course_title,issued_at,revoked_at FROM certificates WHERE user_id=$1 ORDER BY issued_at DESC", [id]),
    sql.query<Record<string, unknown>>("SELECT id,status,created_at,payload FROM tickets WHERE user_id=$1 ORDER BY created_at DESC", [id]),
    sql.query<Record<string, unknown>>("SELECT id,status,created_at,payload FROM submissions WHERE user_id=$1 ORDER BY created_at DESC", [id]),
  ]);
  const activeSessions = sessions.filter((s) => !(s.payload as { revokedAt?: string })?.revokedAt && (!s.expires_at || Date.parse(String(s.expires_at)) > Date.now()));
  return { user: users[0].payload, sessions: { active: activeSessions.length, lastActivity: sessions[0]?.last_seen ?? sessions[0]?.created_at }, enrollments, orders, payments, certificates, tickets, submissions };
}

export async function updateStudentAccount(input: { id: string; name: string; phone: string; email?: string; enabled: boolean }): Promise<{ phoneChanged: boolean }> {
  const phone = normalizeIranianMobile(input.phone); if (!phone) throw new Error("invalid-phone"); if (!input.name.trim()) throw new Error("invalid-name");
  const sql = await getSql(); let phoneChanged = false;
  await sql.transaction(async (tx) => {
    const rows = await tx.query<{ phone: string; role: string; payload: User }>("SELECT phone,role,payload FROM users WHERE id=$1 FOR UPDATE", [input.id]); const current = rows[0];
    if (!current || current.role !== "student") throw new Error("not-student");
    phoneChanged = current.phone !== phone;
    if (phoneChanged) { const duplicate = await tx.query("SELECT id FROM users WHERE phone=$1 AND id<>$2", [phone, input.id]); if (duplicate.length) throw new Error("duplicate-phone"); }
    const next: User = { ...current.payload, name: input.name.trim(), phone, email: input.email?.trim() || undefined, disabled: !input.enabled, disabledReason: input.enabled ? undefined : "غیرفعال‌شده توسط مدیر" };
    await tx.query("UPDATE users SET phone=$2,email=$3,payload=$4::text::jsonb,updated_at=now() WHERE id=$1", [input.id, phone, next.email ?? null, JSON.stringify(next)]);
    if (phoneChanged || !input.enabled) await tx.query("DELETE FROM sessions WHERE user_id=$1", [input.id]);
  });
  await syncCollections(["users", "sessions"]); return { phoneChanged };
}

export async function revokeStudentSessions(id: string): Promise<number> { const sql = await getSql(); const rows = await sql.query<{ token: string }>("DELETE FROM sessions WHERE user_id=$1 RETURNING token", [id]); await syncCollections(["sessions"]); return rows.length; }

export async function deleteRegisteredStudent(id: string): Promise<"hard_deleted" | "anonymized"> {
  const sql = await getSql(); let mode: "hard_deleted" | "anonymized" = "hard_deleted";
  await sql.transaction(async (tx) => {
    const users = await tx.query<{ role: string; payload: User }>("SELECT role,payload FROM users WHERE id=$1 FOR UPDATE", [id]); const user = users[0];
    if (!user || user.role !== "student") throw new Error("protected-account");
    const retained = await tx.query<{ retained: boolean }>(`SELECT EXISTS(SELECT 1 FROM orders WHERE user_id=$1 AND status IN ('paid','completed','processing','shipped','delivered')) OR EXISTS(SELECT 1 FROM payments p JOIN orders o ON o.id=p.order_id WHERE o.user_id=$1 AND p.status IN ('paid','success','verified')) OR EXISTS(SELECT 1 FROM certificates WHERE user_id=$1) AS retained`, [id]);
    await tx.query("DELETE FROM sessions WHERE user_id=$1", [id]);
    if (retained[0]?.retained) {
      mode = "anonymized"; const suffix = crypto.createHash("sha256").update(id).digest("hex").slice(0, 12); const anon: User = { ...user.payload, name: "کاربر حذف‌شده", phone: `deleted-${suffix}`, email: undefined, disabled: true, disabledReason: "حساب بسته و ناشناس‌سازی شد", province: undefined, city: undefined, age: undefined, gender: undefined, bio: undefined };
      await tx.query("UPDATE users SET phone=$2,email=NULL,password_hash=$3,payload=$4::text::jsonb,updated_at=now() WHERE id=$1", [id, anon.phone, `deleted:${crypto.randomBytes(32).toString("hex")}`, JSON.stringify(anon)]);
    } else {
      await tx.query("DELETE FROM lesson_progress WHERE user_id=$1", [id]); await tx.query("DELETE FROM certificate_requests WHERE user_id=$1", [id]); await tx.query("DELETE FROM enrollments WHERE user_id=$1", [id]); await tx.query("DELETE FROM password_resets WHERE user_id=$1", [id]); await tx.query("DELETE FROM users WHERE id=$1", [id]);
    }
  });
  await syncCollections(["users", "sessions", "enrollments"]); return mode;
}
