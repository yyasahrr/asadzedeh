import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfiguredTrustBadge } from "@/components/layout/Footer";
import type { TrustBadgeSettings } from "@/lib/types";
import { safeImageSource } from "@/lib/urls";
import fs from "node:fs";

const badge = (overrides: Partial<TrustBadgeSettings> = {}): TrustBadgeSettings => ({
  enabled: true,
  title: "مرکز ملی فرش ایران",
  image: "/images/licenses/national-carpet-center.webp",
  href: "",
  ...overrides,
});

function render(value: TrustBadgeSettings): string {
  return renderToStaticMarkup(React.createElement(ConfiguredTrustBadge, { badge: value }));
}

describe("configured footer trust badges", () => {
  it("renders National Carpet Center with an image when href is empty", () => {
    const html = render(badge());
    expect(html).toContain("مرکز ملی فرش ایران");
    expect(html).toContain("نشان مرکز ملی فرش ایران");
    expect(html).not.toContain("<a");
  });

  it("renders TVTO with its real configured image path", () => {
    const html = render(badge({
      title: "سازمان آموزش فنی و حرفه‌ای کشور",
      image: "/images/licenses/tvto.webp",
    }));
    expect(html).toContain("/images/licenses/tvto.webp");
    expect(html).toContain("نشان سازمان آموزش فنی و حرفه‌ای کشور");
  });

  it("wraps a valid verification URL in a safe external link", () => {
    const html = render(badge({ href: "https://example.ir/verify" }));
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('href="https://example.ir/verify"');
  });

  it("renders malformed href as a non-clickable card", () => {
    const html = render(badge({ href: "javascript:alert(1)" }));
    expect(html).toContain("مرکز ملی فرش ایران");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("javascript:");
  });

  it("hides disabled badges and badges without a valid image", () => {
    expect(render(badge({ enabled: false }))).toBe("");
    expect(render(badge({ image: "" }))).toBe("");
    expect(render(badge({ image: "data:image/svg+xml,x" }))).toBe("");
    expect(renderToStaticMarkup(React.createElement(ConfiguredTrustBadge, { badge: badge(), imageAvailable: false }))).toBe("");
  });

  it("accepts and preserves Media Library image routes", () => {
    const mediaPath = "/api/media/uploads/authority-logo.webp";
    expect(safeImageSource(mediaPath)).toBe(mediaPath);
    expect(render(badge({ image: mediaPath }))).toContain(mediaPath);
  });

  it("rejects unsafe image protocols", () => {
    expect(safeImageSource("javascript:alert(1)")).toBe("");
    expect(safeImageSource("data:image/svg+xml,x")).toBe("");
    expect(safeImageSource("//evil.example/logo.png")).toBe("");
  });

  it("uses the media workflow and preserves badge image fields on save", () => {
    const contentPage = fs.readFileSync("app/admin/content/page.tsx", "utf8");
    const uploadField = fs.readFileSync("components/admin/UploadField.tsx", "utf8");
    const actions = fs.readFileSync("app/admin/actions.ts", "utf8");
    expect(contentPage).toContain("listMedia()");
    expect(contentPage).toContain("gallery={badgeGallery}");
    expect(uploadField).toContain("object-contain");
    expect(actions).toContain('safeImageSource(str(fd, "nationalCarpetImage"))');
    expect(actions).toContain('safeImageSource(str(fd, "tvtoImage"))');
  });
});
