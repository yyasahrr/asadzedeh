import type { Product } from "@/lib/types";

/**
 * Product feeds for Iranian price-comparison engines.
 *
 * Torob and Emalls both ingest a Google-Shopping-shaped XML feed: they are given
 * a URL and re-fetch it periodically, so the integration is a correctly-shaped,
 * always-current document rather than an API handshake. That matters for how this
 * is built — the feed must be cheap to generate on every request and must never
 * expose a price or a stock figure that contradicts the shop, because a mismatch
 * is how a listing gets suspended.
 *
 * Basalam is a marketplace rather than a comparison engine and needs merchant
 * credentials; see `lib/channels/basalam.ts`.
 */

export const FEED_CHANNELS = ["torob", "emalls"] as const;
export type FeedChannel = (typeof FEED_CHANNELS)[number];

export const FEED_CHANNEL_LABELS: Record<FeedChannel, string> = {
  torob: "ترب",
  emalls: "ایمالز",
};

/** Characters that would break the document or change its meaning. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Control characters are illegal in XML 1.0 outright.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

function tag(name: string, value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  return `    <g:${name}>${esc(String(value))}</g:${name}>\n`;
}

/** Sellable quantity, accounting for stock already held by unpaid orders. */
function availableStock(p: Product): number {
  return Math.max(0, (p.stock ?? 0) - (p.reservedStock ?? 0));
}

/**
 * Availability in the vocabulary the engines expect.
 *
 * A backorder-allowed product is reported as preorder rather than out_of_stock:
 * claiming it is in stock when nobody can pay for it today is exactly the kind of
 * mismatch that gets a feed rejected.
 */
function availability(p: Product): string {
  if (availableStock(p) > 0) return "in_stock";
  if (p.allowBackorder) return "preorder";
  return "out_of_stock";
}

export interface FeedItem {
  id: string;
  title: string;
  link: string;
  imageLink: string;
  /** Toman. */
  price: number;
  availability: string;
  brand?: string;
  description?: string;
  category?: string;
}

/**
 * Render the Google-Shopping XML envelope.
 *
 * Prices are emitted as plain Toman integers with the IRR currency code; the
 * engines expect the smallest advertised unit and a currency, not a formatted
 * string, so no thousands separators are applied here.
 */
export function renderProductFeedXml(items: FeedItem[]): string {
  const body = items
    .map((it) => {
      return (
        "  <item>\n" +
        tag("id", it.id) +
        tag("title", it.title) +
        tag("link", it.link) +
        tag("image_link", it.imageLink) +
        tag("price", `${it.price} IRR`) +
        tag("availability", it.availability) +
        tag("brand", it.brand) +
        tag("description", it.description) +
        tag("product_type", it.category) +
        "  </item>\n"
      );
    })
    .join("");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
    "  <channel>\n" +
    "    <title>اسدزاده</title>\n" +
    `    <link>${esc("")}</link>\n` +
    "    <description>فید محصولات کارگاه قالی‌بافی اسدزاده</description>\n" +
    body +
    "  </channel>\n" +
    "</rss>\n"
  );
}

/**
 * Build the item list for a channel.
 *
 * Only physical goods are included: a course or a class has no stock and no
 * shipping, so listing it in a price-comparison engine would be a lie the engine
 * would eventually reject.
 */
export function buildFeedItems(
  products: Product[],
  baseUrl: string,
  channel: FeedChannel,
  options: { brand?: string } = {},
): FeedItem[] {
  return products
    .filter((p) => p.kind === "physical" && p.active !== false && p.price > 0)
    .map((p) => ({
      // Engines match on a stable merchant id; the SKU is that id when the shop
      // has one, otherwise the slug keeps the feed stable across renames.
      id: p.sku || `${channel}-${p.slug}`,
      title: p.title,
      link: `${baseUrl}/shop/${p.slug}`,
      imageLink: p.image ? `${baseUrl}${p.image.startsWith("/") ? "" : "/"}${p.image}` : "",
      price: p.price,
      availability: availability(p),
      brand: options.brand,
      description: p.excerpt || undefined,
      category: p.category || undefined,
    }));
}
