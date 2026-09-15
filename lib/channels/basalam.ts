import type { Product } from "@/lib/types";
import { getSettings } from "@/lib/store";

/**
 * Basalam marketplace boundary.
 *
 * Basalam is a marketplace, not a comparison engine: it does not pull a feed, it
 * expects the shop to push listings and to accept orders through a merchant API.
 * That API is issued per-merchant behind a private agreement, and its endpoint
 * contract is not something this repository can verify. So this module
 * deliberately stops at the boundary:
 *
 *   - it shapes our own product data into a marketplace listing (real, testable);
 *   - it reports configuration state honestly;
 *   - it refuses to claim a publish succeeded when no credentials exist.
 *
 * Wiring the actual HTTP calls requires the merchant credentials and the
 * published endpoint contract. Until then this is **BLOCKED BY EXTERNAL
 * CONFIGURATION**, not a working integration, and it must not be presented as
 * one. Inventing endpoints here would produce code that looks finished and fails
 * on the first real call.
 */

export interface BasalamListing {
  /** Merchant-side identifier, stable across edits. */
  externalId: string;
  title: string;
  /** Toman. */
  price: number;
  /** Sellable units right now. */
  quantity: number;
  category: string;
  description: string;
  imageUrl: string;
  sku?: string;
  weightGrams: number;
}

export type BasalamStatus =
  | { state: "ready" }
  | { state: "blocked"; reason: string };

/** Shape a product into a marketplace listing. */
export function toListing(product: Product, baseUrl: string): BasalamListing | null {
  // A marketplace cannot sell what has no price or is switched off.
  if (product.kind !== "physical" || product.active === false || product.price <= 0) return null;
  const quantity = Math.max(0, (product.stock ?? 0) - (product.reservedStock ?? 0));
  return {
    externalId: product.sku || product.slug,
    title: product.title,
    price: product.price,
    quantity,
    category: product.category,
    description: product.excerpt,
    imageUrl: product.image ? `${baseUrl}${product.image.startsWith("/") ? "" : "/"}${product.image}` : "",
    sku: product.sku,
    weightGrams: product.weightGrams ?? 0,
  };
}

/** Build the full listing set the shop would publish. */
export function buildListings(products: Product[], baseUrl: string): BasalamListing[] {
  return products
    .map((p) => toListing(p, baseUrl))
    .filter((l): l is BasalamListing => l !== null);
}

/**
 * Report whether a real publish is possible.
 *
 * Never returns "ready" without both credentials, so no caller can mistake a
 * configured-looking shop for a connected one.
 */
export function basalamStatus(): BasalamStatus {
  const { basalam } = getSettings().channels;
  if (!basalam.enabled) return { state: "blocked", reason: "کانال باسلام غیرفعال است" };
  if (!basalam.merchantId || !basalam.apiKey) {
    return {
      state: "blocked",
      reason: "شناسه فروشنده یا کلید API باسلام وارد نشده است (BLOCKED BY EXTERNAL CONFIGURATION)",
    };
  }
  return { state: "ready" };
}

/**
 * Publish listings to Basalam.
 *
 * Refuses rather than pretending: with no verified endpoint contract and no
 * credentials, returning success here would be a lie the operator would only
 * discover when no products appeared.
 */
// Signature takes no listings: there is nothing to send yet, and accepting an
// argument would imply otherwise.
export function publishListings(): { ok: false; reason: string } {
  const status = basalamStatus();
  if (status.state === "blocked") {
    return { ok: false, reason: status.reason };
  }
  return {
    ok: false,
    reason: "اتصال API باسلام هنوز پیاده‌سازی نشده است — قرارداد پایانه‌ها و اعتبارنامه فروشنده لازم است",
  };
}
