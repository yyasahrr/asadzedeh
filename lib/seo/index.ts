import type { Metadata } from "next";
import type { SeoEntry, SeoEntityType, Settings } from "@/lib/types";
import { getSeoEntry, getSettings } from "@/lib/store";
import { appUrl } from "@/lib/env";
export { isPrivatePath } from "./paths";

export type SeoSource = {
  title: string;
  description?: string;
  image?: string;
  path: string;
  imageAlt?: string;
  type?: SeoEntityType;
  id?: string;
};

function defaults(settings?: Settings) {
  const seo = settings?.seo;
  const site = settings?.site;
  return {
    defaultTitle: seo?.defaultTitle || site?.siteName || "اسدزاده",
    titleTemplate: seo?.titleTemplate || "%s | اسدزاده",
    defaultDescription: seo?.defaultDescription || site?.tagline || "",
    defaultOgImage: seo?.defaultOgImage || site?.hero?.image || "/images/hero-weaver.jpg",
    siteName: seo?.siteName || site?.siteName || "اسدزاده",
    canonicalBaseUrl: (seo?.canonicalBaseUrl || site?.siteUrl || appUrl()).replace(/\/$/, ""),
    robotsIndex: seo?.robotsIndex !== false,
    robotsFollow: seo?.robotsFollow !== false,
  };
}

export function applyTitleTemplate(title: string, template: string, siteName: string): string {
  if (!title) return siteName;
  if (title.includes(siteName)) return title;
  return template.replace("%s", title);
}

export function resolveSeo(source: SeoSource, settings?: Settings): {
  title: string;
  description: string;
  image: string;
  canonical: string;
  index: boolean;
  follow: boolean;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  imageAlt: string;
  entry?: SeoEntry;
} {
  const d = defaults(settings ?? getSettings());
  const entry = source.type && source.id ? getSeoEntry(source.type, source.id) : undefined;
  const title = entry?.metaTitle || source.title || d.defaultTitle;
  const description = entry?.metaDescription || source.description || d.defaultDescription;
  const image = entry?.ogImage || source.image || d.defaultOgImage;
  const canonical = entry?.canonicalUrl || `${d.canonicalBaseUrl}${source.path.startsWith("/") ? source.path : `/${source.path}`}`;
  return {
    title,
    description,
    image,
    canonical,
    index: entry?.index ?? d.robotsIndex,
    follow: entry?.follow ?? d.robotsFollow,
    ogTitle: entry?.ogTitle || title,
    ogDescription: entry?.ogDescription || description,
    twitterTitle: entry?.twitterTitle || entry?.ogTitle || title,
    twitterDescription: entry?.twitterDescription || entry?.ogDescription || description,
    twitterImage: entry?.twitterImage || image,
    imageAlt: entry?.imageAlt || source.imageAlt || title,
    entry,
  };
}

export function toMetadata(source: SeoSource, settings?: Settings): Metadata {
  const seo = resolveSeo(source, settings);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    robots: { index: seo.index, follow: seo.follow },
    openGraph: {
      type: "website",
      locale: "fa_IR",
      siteName: defaults(settings ?? getSettings()).siteName,
      title: seo.ogTitle,
      description: seo.ogDescription,
      url: seo.canonical,
      images: seo.image ? [{ url: seo.image, alt: seo.imageAlt }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.twitterTitle,
      description: seo.twitterDescription,
      images: seo.twitterImage ? [seo.twitterImage] : undefined,
    },
  };
}

export function noIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
  };
}

export function jsonLd(data: Record<string, unknown> | Record<string, unknown>[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function organizationJsonLd(settings: Settings) {
  const seo = defaults(settings);
  const org = settings.seo?.organization;
  if (!org?.name && !settings.site.siteName) return null;
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: org?.name || settings.site.siteName,
    url: seo.canonicalBaseUrl,
    logo: org?.logo || undefined,
    telephone: org?.phone || settings.site.phone || undefined,
    address: org?.address || settings.site.address
      ? { "@type": "PostalAddress", streetAddress: org?.address || settings.site.address, addressCountry: "IR" }
      : undefined,
    sameAs: [settings.site.socials.instagram, settings.site.socials.telegram].filter((u) => u && u !== "#"),
  };
}

export function websiteJsonLd(settings: Settings) {
  const seo = defaults(settings);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: seo.siteName,
    url: seo.canonicalBaseUrl,
    inLanguage: "fa-IR",
    potentialAction: {
      "@type": "SearchAction",
      target: `${seo.canonicalBaseUrl}/courses`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[], base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${base.replace(/\/$/, "")}${item.path}`,
    })),
  };
}


