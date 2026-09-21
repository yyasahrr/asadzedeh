import { describe, expect, it } from "vitest";
import { getInstructorSlugs, isInstructorAssigned, normalizeInstructorAssignment } from "../instructors";

describe("multi-instructor compatibility", () => {
  it("normalizes a legacy primary instructor", () => {
    expect(getInstructorSlugs({ instructorSlug: "primary" })).toEqual(["primary"]);
  });

  it("keeps primary first and removes duplicates", () => {
    expect(getInstructorSlugs({ instructorSlug: "a", instructorSlugs: ["b", "a", "b"] })).toEqual(["a", "b"]);
    expect(normalizeInstructorAssignment({ instructorSlug: undefined, instructorSlugs: ["b", "c"] }).instructorSlug).toBe("b");
  });

  it("authorizes every assigned instructor", () => {
    const item = { instructorSlug: "a", instructorSlugs: ["a", "b"] };
    expect(isInstructorAssigned(item, "b")).toBe(true);
    expect(isInstructorAssigned(item, "c")).toBe(false);
  });
});
