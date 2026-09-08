import { appUrl } from "@/lib/env";
import { getProducts, getSettings } from "@/lib/store";
import type { MarketplaceConfig, MarketplaceId, Product } from "@/lib/types";

/**
 * Outbound product channels: Torob, Emalls, Basalam, Digikala.
 *
 * All four ingest the catalogue rather than being called per order, so the
 * integration is a feed the marketplace pulls, not a client we push with. That
 * keeps the surface small: no marketplace credential can be spent by a visitor,
 * and an outage on their side cannot block checkout.
 *
 * Torob and Emalls read a documented JSON/CSV product list (title, price in
 * Toman, availability, canonical URL). Basalam and Digikala additionally have
 * write APIs; the vendor id and token are stored here so that a sync job can be
 * added without another settings migration, and the feed is what they read in
 * the meantime.
 */

export interface FeedItem {
  /** Unique, stable id at our end — marketplaces key their records on it. */
  id: string;
  title: string;
  page_url: string;
  image_link: string;
  /** Toman, integer. */
  price: number;
  old_price?: number;
  availability: "instock" | "outofstock";
  category: string;
  /** Free-form spec text, used by comparison engines for matching. */
  short_desc: string;
  guarantee?: string;
  registry?: string;
}

export const MARKETPLACE_LABELS: Record<MarketplaceId, string> = {
  torob: "ترب",
  emalls: "ایمالز",
  basalam: "باسلام",
  digikala: "دیجی‌کالا",
  custom: "سایر",
};

export function getChannel(id: MarketplaceId): MarketplaceConfig | undefined {
  return getSettings().marketplaces?.channels?.find((c) => c.id === id);
}

/** Whether a feed request for `id` may be served at all. */
export function channelEnabled(id: MarketplaceId): boolean {
  const settings = getSettings().marketplaces;
  return !!settings?.enabled && !!getChannel(id)?.enabled;
}

/**
 * Feed access check.
 *
 * When the operator sets a feed key, it must be presented — otherwise a
 * competitor could scrape the full catalogue with stock levels in one request.
 * Comparison is length-safe but not timing-safe by design: the key gates a
 * public price list, not an account.
 */
export function feedKeyOk(provided: string | null): boolean {
  const key = getSettings().marketplaces?.feedKey ?? "";
  if (!key) return true;
  return provided === key;
}

function isAvailable(product: Product): boolean {
  if (!product.active) return false;
  const reserved = product.reservedStock ?? 0;
  return product.allowBackorder || product.stock - reserved > 0;
}

export function buildFeed(id: MarketplaceId): FeedItem[] {
  const channel = getChannel(id);
  const settings = getSettings();
  const base = (settings.seo?.canonicalBaseUrl || settings.site.siteUrl || appUrl()).replace(/\/$/, "");
  const utm = channel?.utmSource || id;

  return getProducts()
    .filter((p) => p.active)
    .filter((p) => !channel?.inStockOnly || isAvailable(p))
    .map((product) => {
      const image = product.image?.startsWith("http") ? product.image : `${base}${product.image ?? ""}`;
      return {
        id: product.sku || product.slug,
        title: product.title,
        page_url: `${base}/shop/${product.slug}?utm_source=${encodeURIComponent(utm)}&utm_medium=marketplace`,
        image_link: image,
        price: product.price,
        old_price: product.oldPrice,
        availability: isAvailable(product) ? ("instock" as const) : ("outofstock" as const),
        category: product.category,
        short_desc: [product.excerpt, ...product.specs.map((s) => `${s.label}: ${s.value}`)]
          .filter(Boolean)
          .join(" — ")
          .slice(0, 500),
      };
    });
}

/** CSV form, which Emalls and several smaller engines prefer over JSON. */
export function feedToCsv(items: FeedItem[]): string {
  const columns: (keyof FeedItem)[] = [
    "id",
    "title",
    "page_url",
    "image_link",
    "price",
    "old_price",
    "availability",
    "category",
    "short_desc",
  ];
  const escape = (value: unknown) => {
    const text = value === undefined || value === null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [columns.join(","), ...items.map((item) => columns.map((c) => escape(item[c])).join(","))].join("\n");
}
