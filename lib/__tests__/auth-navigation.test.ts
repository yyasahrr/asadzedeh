import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth-navigation";

describe("safeNextPath", () => {
  it("keeps an internal application path", () => {
    expect(safeNextPath("/dashboard/courses?tab=active", "/dashboard")).toBe(
      "/dashboard/courses?tab=active"
    );
  });

  it.each(["//evil.example", "/\\evil.example", "https://evil.example", "\n/location"])(
    "rejects an external or malformed redirect: %s",
    (value) => {
      expect(safeNextPath(value, "/dashboard")).toBe("/dashboard");
    }
  );
});
