"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getSeoEntries, getSeoRedirects, getSettings, writeDb } from "@/lib/store";
import type { SeoEntry, SeoEntityType, SeoRedirect } from "@/lib/types";

async function requireSeo() {
  const user = await getSessionUser();
  if (!can(user, "seo")) redirect("/admin");
  return user!;
}

export async function saveSeoDefaults(fd: FormData) {
  const me = await requireSeo();
  const s = getSettings();
  const str = (k: string) => String(fd.get(k) ?? "").trim();
  writeDb({
    settings: {
      ...s,
      seo: {
        defaultTitle: str("defaultTitle") || s.seo?.defaultTitle || s.site.siteName,
        titleTemplate: str("titleTemplate") || "%s | اسدزاده",
        defaultDescription: str("defaultDescription") || s.site.tagline,
        defaultOgImage: str("defaultOgImage") || "/images/hero-weaver.jpg",
        siteName: str("siteName") || s.site.siteName,
        canonicalBaseUrl: str("canonicalBaseUrl").replace(/\/$/, "") || s.site.siteUrl,
        robotsIndex: str("robotsIndex") === "on",
        robotsFollow: str("robotsFollow") === "on",
        social: {
          instagram: str("socialInstagram"),
          telegram: str("socialTelegram"),
          twitter: str("socialTwitter"),
        },
        organization: {
          name: str("orgName") || s.site.siteName,
          logo: str("orgLogo") || "/icon.svg",
          phone: str("orgPhone") || s.site.phone,
          address: str("orgAddress") || s.site.address,
          openingHours: str("orgHours"),
        },
      },
    },
  });
  await audit({ action: "settings.update", actor: { id: me.id, name: me.name, role: me.role }, detail: { section: "seo" } });
  revalidatePath("/", "layout");
  redirect("/admin/seo?saved=defaults");
}

export async function saveSeoEntry(fd: FormData) {
  const me = await requireSeo();
  const entityType = String(fd.get("entityType") ?? "") as SeoEntityType;
  const entityId = String(fd.get("entityId") ?? "").trim();
  if (!entityType || !entityId) redirect("/admin/seo");
  const str = (k: string) => String(fd.get(k) ?? "").trim() || undefined;
  const entry: SeoEntry = {
    entityType,
    entityId,
    metaTitle: str("metaTitle"),
    metaDescription: str("metaDescription"),
    canonicalUrl: str("canonicalUrl"),
    ogTitle: str("ogTitle"),
    ogDescription: str("ogDescription"),
    ogImage: str("ogImage"),
    twitterTitle: str("twitterTitle"),
    twitterDescription: str("twitterDescription"),
    twitterImage: str("twitterImage"),
    index: String(fd.get("index") ?? "") === "on",
    follow: String(fd.get("follow") ?? "") === "on",
    schemaType: str("schemaType"),
    imageAlt: str("imageAlt"),
  };
  const rest = getSeoEntries().filter((e) => !(e.entityType === entityType && e.entityId === entityId));
  writeDb({ seoEntries: [...rest, entry] });
  await audit({ action: "content.update", actor: { id: me.id, name: me.name, role: me.role }, target: `seo:${entityType}:${entityId}` });
  revalidatePath("/", "layout");
  redirect("/admin/seo?saved=entry");
}

function wouldLoop(fromPath: string, toPath: string, existing: SeoRedirect[]): boolean {
  if (fromPath === toPath) return true;
  const map = new Map(existing.filter((r) => r.enabled).map((r) => [r.fromPath, r.toPath]));
  map.set(fromPath, toPath);
  let cur = toPath;
  const seen = new Set<string>([fromPath]);
  for (let i = 0; i < 20; i++) {
    const next = map.get(cur);
    if (!next) return false;
    if (seen.has(next)) return true;
    seen.add(next);
    cur = next;
  }
  return true;
}

export async function saveSeoRedirect(fd: FormData) {
  const me = await requireSeo();
  const fromPath = String(fd.get("fromPath") ?? "").trim();
  const toPath = String(fd.get("toPath") ?? "").trim();
  const statusCode = Number(fd.get("statusCode")) === 308 ? 308 : 301;
  if (!fromPath.startsWith("/") || !toPath.startsWith("/") || fromPath.includes("://") || toPath.includes("://")) {
    redirect("/admin/seo/redirects?error=" + encodeURIComponent("مسیر باید با / شروع شود"));
  }
  const existing = getSeoRedirects();
  if (wouldLoop(fromPath, toPath, existing)) {
    redirect("/admin/seo/redirects?error=" + encodeURIComponent("این ریدایرکت حلقه ایجاد می‌کند"));
  }
  const id = String(fd.get("id") ?? "") || `rd-${crypto.randomBytes(4).toString("hex")}`;
  const row: SeoRedirect = { id, fromPath, toPath, statusCode, enabled: String(fd.get("enabled") ?? "on") === "on" };
  writeDb({ seoRedirects: [...existing.filter((r) => r.id !== id && r.fromPath !== fromPath), row] });
  await audit({ action: "content.update", actor: { id: me.id, name: me.name, role: me.role }, target: `redirect:${fromPath}` });
  revalidatePath("/", "layout");
  redirect("/admin/seo/redirects?saved=1");
}

export async function deleteSeoRedirect(fd: FormData) {
  const me = await requireSeo();
  const id = String(fd.get("id") ?? "");
  writeDb({ seoRedirects: getSeoRedirects().filter((r) => r.id !== id) });
  await audit({ action: "content.update", actor: { id: me.id, name: me.name, role: me.role }, detail: { deletedRedirect: id } });
  redirect("/admin/seo/redirects");
}

export async function recordSlugRedirect(fromPath: string, toPath: string) {
  if (!fromPath || fromPath === toPath) return;
  const existing = getSeoRedirects();
  if (existing.some((r) => r.fromPath === fromPath)) return;
  if (wouldLoop(fromPath, toPath, existing)) return;
  writeDb({
    seoRedirects: [
      ...existing,
      { id: `rd-${crypto.randomBytes(4).toString("hex")}`, fromPath, toPath, statusCode: 301, enabled: true },
    ],
  });
}
