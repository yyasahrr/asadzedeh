import { describe, expect, it } from "vitest";
import { reorderItems } from "@/components/admin/StructuredListEditor";
import { normalizeAboutContent, normalizeHomeContent } from "@/lib/site-content";

const rows = [{ id: "a", order: 0 }, { id: "b", order: 1 }, { id: "c", order: 2 }];

describe("CMS media reordering", () => {
  it("keeps stable IDs, assigns persisted order, and blocks endpoint moves", () => {
    expect(reorderItems(rows, 0, -1)).toBe(rows);
    expect(reorderItems(rows, 2, 1)).toBe(rows);
    expect(reorderItems(rows, 1, -1)).toEqual([{ id: "b", order: 0 }, { id: "a", order: 1 }, { id: "c", order: 2 }]);
  });

  it("persists workshop and student-work order through normalization", () => {
    const workshop = reorderItems([
      { id: "work-a", order: 0, media: { kind: "image" as const, image: "/images/a.jpg" }, alt: "a", caption: "", active: true },
      { id: "work-b", order: 1, media: { kind: "image" as const, image: "/images/b.jpg" }, alt: "b", caption: "", active: true },
    ], 1, -1);
    const studentWorks = reorderItems([
      { id: "student-a", order: 0, title: "a", studentName: "a", image: "/images/a.jpg", description: "", course: "", active: true },
      { id: "student-b", order: 1, title: "b", studentName: "b", image: "/images/b.jpg", description: "", course: "", active: true },
    ], 1, -1);
    const restored = normalizeHomeContent({ workshop: { items: workshop }, studentWorks: { items: studentWorks } });
    expect(restored.workshop.items.map(item => item.id)).toEqual(["work-b", "work-a"]);
    expect(restored.studentWorks.items.map(item => item.id)).toEqual(["student-b", "student-a"]);
  });

  it("persists about-gallery order through normalization", () => {
    const items = reorderItems([
      { id: "about-a", order: 0, media: { kind: "image" as const, image: "/images/a.jpg" }, alt: "a", active: true },
      { id: "about-b", order: 1, media: { kind: "image" as const, image: "/images/b.jpg" }, alt: "b", active: true },
    ], 1, -1);
    expect(normalizeAboutContent({ gallery: { items } }, []).gallery.items.map(item => item.id)).toEqual(["about-b", "about-a"]);
  });
});
