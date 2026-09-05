import type { MetadataRoute } from "next";
import { getArticles, getClasses, getCourses, getSettings } from "@/lib/store";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSettings().site.siteUrl.replace(/\/$/, "") || "https://asadzedeh.ir";
  const now = new Date();
  const staticPages = [
    "",
    "/courses",
    "/classes",
    "/paths",
    "/instructors",
    "/blog",
    "/about",
    "/auth",
    "/cart",
  ].map((p) => ({ url: `${base}${p || "/"}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 }));

  const courses = getCourses().map((c) => ({
    url: `${base}/courses/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const classes = getClasses().map((c) => ({
    url: `${base}/classes/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const articles = getArticles().map((a) => ({
    url: `${base}/blog/${a.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [...staticPages, ...courses, ...classes, ...articles];
}
