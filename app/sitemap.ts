import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";
import { getActiveLearningPaths, getActiveProducts, getArticles, getClasses, getCourses } from "@/lib/store";

function validDate(value: unknown): Date | undefined {
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const staticPages = ["", "/courses", "/classes", "/classes/schedule", "/paths", "/instructors", "/shop", "/shop/preorder", "/blog", "/about", "/terms", "/privacy", "/rules"].map((p) => ({
    url: `${base}${p || "/"}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  const courses = getCourses().map((c) => ({
    url: `${base}/courses/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const classes = getClasses().map((c) => ({
    url: `${base}/classes/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const articles = getArticles().map((a) => ({
    url: `${base}/blog/${a.slug}`,
    lastModified: validDate(a.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  const products = getActiveProducts().map((p) => ({
    url: `${base}/shop/${p.slug}`,
    lastModified: validDate(p.createdAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  const paths = getActiveLearningPaths().map((p) => ({
    url: `${base}/paths/${p.slug}`,
    lastModified: validDate(p.updatedAt || p.createdAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  return [...staticPages, ...courses, ...classes, ...articles, ...products, ...paths];
}
