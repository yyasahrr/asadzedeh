import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("staff access page presentation", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app/admin/users/page.tsx"), "utf8");

  it("uses the staff projection and renders the authenticated super admin separately", () => {
    expect(source).toContain("splitOwnerAndStaff(getUsers(), sessionOwner.id)");
    expect(source).toContain("مالک سیستم");
    expect(source).toContain('href="/account/security"');
  });

  it("does not offer student as a staff role option", () => {
    expect(source).not.toContain('["manager", "editor", "support", "instructor", "student"]');
  });
});
