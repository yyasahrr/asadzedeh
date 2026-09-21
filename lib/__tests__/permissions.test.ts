import { describe, expect, it } from "vitest";
import { can, isStaff, isSuperAdmin, type SessionUser } from "@/lib/auth";

function user(role: SessionUser["role"]): SessionUser {
  return {
    id: "u1",
    name: "t",
    phone: "09120000000",
    role,
    createdAt: "",
    totpEnabled: false,
    mfaVerified: false,
    sessionToken: "x",
  };
}

describe("permissions", () => {
  it("students cannot access admin perms", () => {
    expect(can(user("student"), "courses")).toBe(false);
    expect(isStaff(user("student"))).toBe(false);
  });

  it("instructors have no admin perms", () => {
    expect(can(user("instructor"), "orders")).toBe(false);
    expect(isStaff(user("instructor"))).toBe(true);
  });

  it("reserves owner identity and sensitive permissions for super_admin", () => {
    expect(isSuperAdmin(user("super_admin"))).toBe(true);
    expect(isSuperAdmin(user("admin"))).toBe(false);
    expect(can(user("admin"), "seo")).toBe(true);
    expect(can(user("admin"), "users")).toBe(false);
    expect(can(user("super_admin"), "security")).toBe(true);
    expect(can(user("support"), "users")).toBe(false);
  });
});
