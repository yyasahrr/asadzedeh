import { availableSeats } from "./stock";
import { gregorianToJalali, jalaliToGregorian, legacyJalaliLabelToGregorian, parseStoredDate } from "./jalali-date";
import type { ClassSessionStatus, InPersonClass } from "./types";

export type ClassScheduleStatus = "open" | "limited" | "full" | "started" | "completed" | "cancelled";
export const classScheduleStatusLabels: Record<ClassScheduleStatus, string> = { open: "ثبت‌نام باز", limited: "ظرفیت محدود", full: "تکمیل ظرفیت", started: "شروع شده", completed: "پایان یافته", cancelled: "لغو شده" };
export type ClassCalendarEventType = "class-start" | "session" | "cancelled-session" | "postponed-session";
export type ClassCalendarEvent = { id: string; classSlug: string; sessionId?: string; date: string; jalaliDate: string; type: ClassCalendarEventType; title: string; classTitle: string; time?: string; instructors: string[]; status: ClassSessionStatus | "class-start"; remaining: number; href: string };
export type JalaliCalendarCell = { date: string; year: number; month: number; day: number; inCurrentMonth: boolean; isFriday: boolean };

export function deriveClassScheduleStatus(item: InPersonClass, now = new Date()): ClassScheduleStatus {
  const sessions = item.sessionSchedule ?? [];
  if (sessions.length && sessions.every(session => session.status === "cancelled")) return "cancelled";
  const today = now.toISOString().slice(0, 10);
  const live = sessions.filter(session => session.status !== "cancelled");
  const last = live.at(-1)?.date;
  if ((live.length > 0 && live.every(session => session.status === "completed")) || (last && last < today)) return "completed";
  if (item.startDate && item.startDate <= today) return "started";
  const remaining = availableSeats(item);
  if (remaining <= 0) return "full";
  if (remaining <= Math.max(2, Math.ceil(item.capacity * 0.2))) return "limited";
  return "open";
}

export function classCategory(item: InPersonClass): string { return item.category?.trim() || item.title.split(/[؛(]/)[0].trim() || "کلاس حضوری"; }

function addUtcDays(iso: string, amount: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function jalaliMonthLength(year: number, month: number): number {
  const first = jalaliToGregorian(`${year}/${String(month).padStart(2, "0")}/01`);
  const next = month === 12 ? jalaliToGregorian(`${year + 1}/01/01`) : jalaliToGregorian(`${year}/${String(month + 1).padStart(2, "0")}/01`);
  if (!first || !next) return 0;
  return Math.round((Date.parse(`${next}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000);
}

export function jalaliFirstWeekday(year: number, month: number): number {
  const first = jalaliToGregorian(`${year}/${String(month).padStart(2, "0")}/01`);
  return first ? (new Date(`${first}T00:00:00Z`).getUTCDay() + 1) % 7 : 0;
}

export function jalaliMonthGrid(year: number, month: number): JalaliCalendarCell[] {
  const first = jalaliToGregorian(`${year}/${String(month).padStart(2, "0")}/01`);
  const days = jalaliMonthLength(year, month);
  if (!first || !days) return [];
  const offset = jalaliFirstWeekday(year, month);
  const count = Math.ceil((offset + days) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const date = addUtcDays(first, index - offset);
    const [cellYear, cellMonth, day] = (gregorianToJalali(date) ?? `${year}/${month}/1`).split("/").map(Number);
    return { date, year: cellYear, month: cellMonth, day, inCurrentMonth: cellYear === year && cellMonth === month, isFriday: new Date(`${date}T00:00:00Z`).getUTCDay() === 5 };
  });
}

export function adjacentJalaliMonth(year: number, month: number, delta: -1 | 1) {
  if (month === 1 && delta === -1) return { year: year - 1, month: 12 };
  if (month === 12 && delta === 1) return { year: year + 1, month: 1 };
  return { year, month: month + delta };
}

export function deriveClassCalendarEvents(classes: InPersonClass[], instructorNames = new Map<string, string>(), legacyYear = currentJalaliMonth().year): ClassCalendarEvent[] {
  const events: ClassCalendarEvent[] = [];
  for (const item of classes) {
    const instructors = (item.instructorSlugs?.length ? item.instructorSlugs : item.instructorSlug ? [item.instructorSlug] : []).map(slug => instructorNames.get(slug)).filter((name): name is string => Boolean(name));
    if (!instructors.length && item.instructor) instructors.push(item.instructor);
    const base = { classSlug: item.slug, classTitle: item.title, instructors, remaining: availableSeats(item), href: `/classes/${item.slug}` };
    if (item.startDate) {
      const date = parseStoredDate(item.startDate) ?? legacyJalaliLabelToGregorian(item.startDate, legacyYear);
      const jalaliDate = date ? gregorianToJalali(date) : null;
      if (date && jalaliDate) events.push({ ...base, id: `${item.slug}:start`, date, jalaliDate, type: "class-start", title: `شروع ${item.title}`, time: item.time, status: "class-start" });
    }
    for (const session of item.sessionSchedule ?? []) {
      const jalaliDate = gregorianToJalali(session.date);
      if (!jalaliDate) continue;
      const type: ClassCalendarEventType = session.status === "cancelled" ? "cancelled-session" : session.status === "postponed" ? "postponed-session" : "session";
      events.push({ ...base, id: `${item.slug}:${session.id}`, sessionId: session.id, date: session.date, jalaliDate, type, title: session.title?.trim() || item.title, time: [session.startTime, session.endTime].filter(Boolean).join(" تا "), status: session.status });
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function classMatchesScheduleFilters(item: InPersonClass, filters: { query?: string; category?: string; instructor?: string; scope?: "current" | "next" | ""; year: number; month: number }, instructorNames: string[]): boolean {
  const query = filters.query?.trim().toLocaleLowerCase("fa") ?? "";
  if (filters.category && classCategory(item) !== filters.category) return false;
  const slugs = item.instructorSlugs?.length ? item.instructorSlugs : item.instructorSlug ? [item.instructorSlug] : [];
  if (filters.instructor && !slugs.includes(filters.instructor)) return false;
  if (query && ![item.title, classCategory(item), ...instructorNames].join(" ").toLocaleLowerCase("fa").includes(query)) return false;
  if (filters.scope) {
    const target = filters.scope === "next" ? adjacentJalaliMonth(filters.year, filters.month, 1) : { year: filters.year, month: filters.month };
    const prefix = `${target.year}/${String(target.month).padStart(2, "0")}/`;
    const storedDates = [parseStoredDate(item.startDate) ?? legacyJalaliLabelToGregorian(item.startDate, target.year), ...(item.sessionSchedule ?? []).map(session => parseStoredDate(session.date))];
    const dates = storedDates.filter((date): date is string => Boolean(date)).map(gregorianToJalali).filter(Boolean);
    if (!dates.some(date => date?.startsWith(prefix))) return false;
  }
  return true;
}

export function currentJalaliMonth(now = new Date()) { const value = gregorianToJalali(now.toISOString().slice(0, 10)) ?? "1405/01/01"; const [year, month] = value.split("/").map(Number); return { year, month }; }
