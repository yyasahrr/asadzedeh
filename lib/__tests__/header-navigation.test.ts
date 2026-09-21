import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { educationLinks, primaryNavLinks } from "@/components/layout/nav";

describe("header navigation", () => {
  it("keeps exactly four Education mega-menu destinations", () => { expect(educationLinks.map(item => [item.label, item.href])).toEqual([["دوره‌های آنلاین", "/courses"], ["دوره‌های حضوری", "/classes"], ["برنامه کلاس‌ها", "/classes/schedule"], ["مسیرهای آموزشی", "/paths"]]); });
  it("keeps independent desktop links outside the mega menu", () => { expect(primaryNavLinks.map(item => item.label)).toEqual(["اساتید", "فروشگاه", "دانشنامه", "درباره ما"]); const header = fs.readFileSync("components/layout/Header.tsx", "utf8"); expect(header).toContain("<EducationMenu />"); expect(header).toContain("primaryNavLinks.map"); });
  it("provides readable mobile grouping and Escape behavior", () => { const mobile = fs.readFileSync("components/layout/MobileMenu.tsx", "utf8"); expect(mobile).toContain("bg-white/92"); expect(mobile).toContain('event.key === "Escape"'); expect(mobile).toContain('aria-controls="mobile-navigation"'); expect(mobile).toContain("educationLinks.map"); expect(mobile).toContain("primaryNavLinks.map"); });
  it("supports hover, click, focus, outside press and Escape on desktop", () => { const menu = fs.readFileSync("components/layout/EducationMenu.tsx", "utf8"); for (const behavior of ["onPointerEnter", "onClick", "onFocus", "pointerdown", 'event.key === "Escape"']) expect(menu).toContain(behavior); });
});
