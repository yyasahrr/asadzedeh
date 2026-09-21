import { describe, expect, it } from "vitest";
import { splitOwnerAndStaff } from "@/lib/staff-users";
import type { Role, User } from "@/lib/types";

const user = (id: string, role: Role): User => ({ id, role, name: id, phone: `0912000000${id.length}`, passwordHash: "hash", createdAt: "today" });

describe("staff account projection", () => {
  it("separates the current owner and keeps every non-student staff role", () => {
    const roles: Role[] = ["super_admin", "admin", "manager", "editor", "support", "instructor", "student"];
    const result = splitOwnerAndStaff(roles.map((role, index) => user(`u-${index}`, role)), "u-0");
    expect(result.owner?.role).toBe("super_admin");
    expect(result.staff.map((item) => item.role)).toEqual(["admin", "manager", "editor", "support", "instructor"]);
  });

  it("never returns a student in the staff access table", () => {
    const result = splitOwnerAndStaff([user("owner", "super_admin"), user("student", "student")], "owner");
    expect(result.staff).toEqual([]);
  });
});
