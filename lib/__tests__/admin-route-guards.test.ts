import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const guarded: Record<string, string> = {
  "app/admin/courses/page.tsx": "courses", "app/admin/classes/page.tsx": "classes",
  "app/admin/students/page.tsx": "students", "app/admin/certificates/page.tsx": "certificates",
  "app/admin/orders/page.tsx": "orders", "app/admin/payments/page.tsx": "payments",
  "app/admin/settings/page.tsx": "settings", "app/admin/security/page.tsx": "security",
  "app/admin/media/page.tsx": "media", "app/admin/content/page.tsx": "content",
  "app/admin/seo/page.tsx": "seo", "app/admin/instructors/page.tsx": "instructors",
  "app/admin/notify/page.tsx": "notify", "app/admin/videos/page.tsx": "videos",
  "app/admin/shop/page.tsx": "shop", "app/admin/audit/page.tsx": "audit",
};

describe("admin route authorization", () => {
  for (const [file, permission] of Object.entries(guarded)) {
    it(`${file} enforces ${permission}`, () => {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toMatch(new RegExp(`can\\((user|me), ["']${permission}["']\\)`));
    });
  }
  it("users and access profiles are explicitly owner-only", () => {
    for (const file of ["app/admin/users/page.tsx", "app/admin/users/access-profiles/page.tsx"]) {
      expect(fs.readFileSync(path.join(process.cwd(), file), "utf8")).toContain("isSuperAdmin(user)");
    }
  });
});
