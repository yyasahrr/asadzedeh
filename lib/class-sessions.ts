import crypto from "node:crypto";
import { parseStoredDate } from "./jalali-date";
import type { ClassSession, ClassSessionStatus } from "./types";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const STATUSES = new Set<ClassSessionStatus>(["scheduled", "completed", "cancelled", "postponed"]);

export function parseClassSessions(value: FormDataEntryValue | null): { ok: true; sessions: ClassSession[]; startDate: string } | { ok: false; error: string } {
  if (!value) return { ok: true, sessions: [], startDate: "" };
  let raw: unknown;
  try { raw = JSON.parse(String(value)); } catch { return { ok: false, error: "برنامه جلسات معتبر نیست." }; }
  if (!Array.isArray(raw) || raw.length > 100) return { ok: false, error: "تعداد جلسات معتبر نیست." };
  const sessions: ClassSession[] = [];
  const duplicates = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") return { ok: false, error: "اطلاعات جلسه معتبر نیست." };
    const input = item as Record<string, unknown>;
    const date = parseStoredDate(String(input.date ?? ""));
    const startTime = String(input.startTime ?? "");
    const endTime = String(input.endTime ?? "");
    const status = String(input.status ?? "scheduled") as ClassSessionStatus;
    if (!date || !TIME.test(startTime) || !TIME.test(endTime) || endTime <= startTime || !STATUSES.has(status)) {
      return { ok: false, error: "تاریخ یا ساعت جلسه معتبر نیست؛ ساعت پایان باید بعد از شروع باشد." };
    }
    const duplicateKey = `${date}:${startTime}`;
    if (duplicates.has(duplicateKey)) return { ok: false, error: "دو جلسه با تاریخ و ساعت شروع یکسان ثبت شده است." };
    duplicates.add(duplicateKey);
    sessions.push({
      id: /^[a-z0-9-]{1,80}$/i.test(String(input.id ?? "")) ? String(input.id) : `cs-${crypto.randomBytes(6).toString("hex")}`,
      date, startTime, endTime, title: String(input.title ?? "").trim().slice(0, 120) || undefined, status,
    });
  }
  sessions.sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  return { ok: true, sessions, startDate: sessions[0]?.date ?? "" };
}
