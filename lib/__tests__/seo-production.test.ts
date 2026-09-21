import fs from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { defaultSettings } from "@/lib/seed";
import { safeHttpUrl } from "@/lib/urls";

vi.mock("@/lib/store", () => ({
  getSettings: () => ({ ...defaultSettings, site: { ...defaultSettings.site, siteUrl: "https://typo.invalid" } }),
  getSeoEntry: () => undefined,
  getCourses: () => [{ slug: "course" }],
  getClasses: () => [{ slug: "class" }],
  getArticles: () => [{ slug: "post", date: "not-a-date" }],
  getActiveProducts: () => [{ slug: "product", createdAt: "2025-01-02T00:00:00Z" }],
  getActiveLearningPaths: () => [{ slug: "path", createdAt: "2025-01-03T00:00:00Z" }],
}));

describe("production SEO routes", () => {
  beforeAll(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://typo.invalid/path");
  });

  it("uses appUrl for the production sitemap and never emits fragments", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = sitemap();
    expect(entries.every((entry) => entry.url.startsWith("https://ghalibafiasadzadeh.ir/"))).toBe(true);
    expect(entries.every((entry) => !entry.url.includes("#"))).toBe(true);
    expect(entries.filter((entry) => entry.url.endsWith("/instructors"))).toHaveLength(1);
    expect(entries.find((entry) => entry.url.endsWith("/blog/post"))?.lastModified).toBeUndefined();
  });

  it("allows the public instructor index but blocks the private instructor root/tree", async () => {
    const { default: robots } = await import("@/app/robots");
    const output = robots();
    const rule = Array.isArray(output.rules) ? output.rules[0] : output.rules;
    expect(rule.disallow).toContain("/instructor$");
    expect(rule.disallow).toContain("/instructor/");
    expect(rule.disallow).not.toContain("/instructor");
    expect(output.sitemap).toBe("https://ghalibafiasadzadeh.ir/sitemap.xml");
  });

  it("ignores malformed canonical and external URLs", async () => {
    const { resolveSeo } = await import("@/lib/seo");
    const seo = resolveSeo({ title: "Test", path: "/courses" }, {
      ...defaultSettings,
      seo: { ...defaultSettings.seo!, canonicalBaseUrl: "ghalibafiasadzadeh.ir" },
    });
    expect(seo.canonical).toBe("https://ghalibafiasadzadeh.ir/courses");
    expect(safeHttpUrl("javascript:alert(1)")).toBe("");
    expect(safeHttpUrl("data:text/html,x")).toBe("");
  });
});

describe("public contact UI source", () => {
  it("contains Bale, gated badges, safe external attributes, and no fixed-width dock", () => {
    const footer = fs.readFileSync("components/layout/Footer.tsx", "utf8");
    const dock = fs.readFileSync("components/support/SupportDock.tsx", "utf8");
    expect(footer).toContain("site.socials.bale");
    expect(footer).toContain("noopener noreferrer");
    expect(footer).toContain("!badge.enabled || !image");
    expect(footer).toContain('grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3');
    expect(dock).toContain('key: "phone"');
    expect(dock).toContain('key: "bale"');
    expect(dock).toContain('key: "instagram"');
    expect(dock).toContain("max-w-[calc(100vw-2rem)]");
  });
});
