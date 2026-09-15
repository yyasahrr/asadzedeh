import type { InPersonClass, Product } from "./types";

/**
 * Availability helpers.
 *
 * Kept free of `./store` and `node:*` imports so client components can use them.
 * A reservation is a hold placed by an unpaid order (see `lib/db/commerce.ts`);
 * the numbers below are the only ones the UI should ever show.
 */

/** Units a shopper can still buy: on-hand stock minus unpaid holds. */
export function availableStock(product: Pick<Product, "kind" | "stock" | "allowBackorder" | "reservedStock">): number {
  if (product.kind !== "physical" || product.allowBackorder) return 99;
  return Math.max(0, product.stock - (product.reservedStock ?? 0));
}

/** Seats still sellable: open seats minus unpaid reservations. */
export function availableSeats(item: Pick<InPersonClass, "remaining" | "reservedSeats">): number {
  return Math.max(0, item.remaining - (item.reservedSeats ?? 0));
}
