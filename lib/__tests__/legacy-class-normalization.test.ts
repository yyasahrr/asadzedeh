import { describe, expect, it } from "vitest";
import { normalizeClass } from "../normalize-domain";

describe("legacy in-person class normalization", () => {
  it("prevents the concrete missing instructor/includes detail-page crash", () => {
    const legacy = normalizeClass({ slug: "legacy" } as never);
    expect(() => legacy.instructor.replace("استاد ", "")).not.toThrow();
    expect(() => legacy.includes.map(String)).not.toThrow();
    expect(legacy.lessons).toEqual([]);
    expect(legacy.chapters).toEqual([]);
    expect(legacy.sessionSchedule).toEqual([]);
    expect(legacy.image).toBe("/images/workshop-loom.jpg");
    expect(legacy.location).toContain("اسدزاده");
  });

  it("keeps invalid legacy dates renderable without inventing a date", () => {
    expect(normalizeClass({ slug: "legacy", startDate: "not-a-date" } as never).startDate).toBe("not-a-date");
  });
});
