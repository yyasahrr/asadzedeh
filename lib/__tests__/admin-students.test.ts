import { describe, expect, it } from "vitest";
import { buildAdminStudents } from "@/lib/admin-students";
import type { Enrollment, Student, User } from "@/lib/types";

const users: User[] = [{
  id: "u-1", name: "هنرجوی ثبت‌نامی", phone: "۰۹۱۲۳۴۵۶۷۸۹", passwordHash: "hash", role: "student", createdAt: "۱۴۰۵/۰۶/۲۶",
}];
const enrollments: Enrollment[] = [
  { id: "e-1", userId: "u-1", courseSlug: "one", completed: [], createdAt: "۱۴۰۵/۰۶/۲۶" },
  { id: "e-2", userId: "u-1", courseSlug: "two", completed: [], createdAt: "۱۴۰۵/۰۶/۲۶" },
];

describe("admin student projection", () => {
  it("includes registered students and derives their unique enrollment count", () => {
    const [student] = buildAdminStudents(users, enrollments, []);
    expect(student).toMatchObject({ userId: "u-1", phone: "09123456789", courses: 2, source: "account" });
  });

  it("keeps legacy CRM students without duplicating a registered phone", () => {
    const legacy: Student[] = [
      { name: "duplicate", phone: "09123456789", courses: 9, joinDate: "old", status: "فعال" },
      { name: "legacy", phone: "09120000000", courses: 1, joinDate: "old", status: "فعال" },
    ];
    const result = buildAdminStudents(users, enrollments, legacy);
    expect(result).toHaveLength(2);
    expect(result.find((item) => item.phone === "09120000000")?.source).toBe("legacy");
  });
});
