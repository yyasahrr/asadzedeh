import { describe, expect, it } from "vitest";
import { applyTitleTemplate } from "@/lib/seo";
import { isPrivatePath } from "@/lib/seo/paths";

describe("SEO helpers", () => {
  it("applies title template", () => {
    expect(applyTitleTemplate("فرش‌بافی", "%s | اسدزاده", "اسدزاده")).toBe("فرش‌بافی | اسدزاده");
  });

  it("does not duplicate site name", () => {
    expect(applyTitleTemplate("اسدزاده | آموزش", "%s | اسدزاده", "اسدزاده")).toBe("اسدزاده | آموزش");
  });

  it("marks private routes", () => {
    expect(isPrivatePath("/admin/seo")).toBe(true);
    expect(isPrivatePath("/dashboard")).toBe(true);
    expect(isPrivatePath("/courses/foo")).toBe(false);
  });
});
