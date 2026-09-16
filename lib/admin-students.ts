import { normalizeDigits } from "./format";
import type { Enrollment, Student, User } from "./types";

export interface AdminStudent extends Student {
  source: "account" | "legacy";
  userId?: string;
}

/**
 * Registered student accounts are authoritative. Legacy CRM-only rows remain
 * visible, but are merged by normalized phone so one person is never doubled.
 */
export function buildAdminStudents(users: User[], enrollments: Enrollment[], legacy: Student[]): AdminStudent[] {
  const studentUsers = users.filter((user) => user.role === "student");
  const accountPhones = new Set(studentUsers.map((user) => normalizeDigits(user.phone)));
  const accounts = studentUsers.map((user) => ({
    name: user.name,
    phone: normalizeDigits(user.phone),
    courses: new Set(enrollments.filter((item) => item.userId === user.id).map((item) => item.courseSlug)).size,
    joinDate: user.createdAt,
    status: user.disabled ? "غیرفعال" : "فعال",
    source: "account" as const,
    userId: user.id,
  }));
  const legacyOnly = legacy
    .filter((student) => !accountPhones.has(normalizeDigits(student.phone)))
    .map((student) => ({ ...student, phone: normalizeDigits(student.phone), source: "legacy" as const }));
  return [...accounts, ...legacyOnly];
}
