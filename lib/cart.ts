/** Client-side cart (localStorage). Emits `az:cart` event on change. */

export type CartKind = "course" | "class" | "product" | "learning_path";

export interface CartItem {
  kind: CartKind;
  slug: string;
  title: string;
  price: number;
  image: string;
  meta?: string;
  /** Quantity (products only; courses/classes/paths are always 1). */
  qty?: number;
  /** Max purchasable quantity (stock) for products. */
  maxQty?: number;
  /** Physical products need a shipping address. */
  physical?: boolean;
  weightGrams?: number;
}

const KEY = "az_cart";
export const COUPON_CODE = "ASAD10";
export const COUPON_PERCENT = 10;

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(items: CartItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("az:cart", { detail: items }));
}

export function getCart(): CartItem[] {
  return read();
}

export function itemQty(i: CartItem): number {
  return i.kind === "product" ? Math.max(1, i.qty ?? 1) : 1;
}

export function addToCart(item: CartItem): CartItem[] {
  const items = read();
  const existing = items.find((i) => i.slug === item.slug && i.kind === item.kind);
  if (existing) {
    if (item.kind === "product") {
      const next = itemQty(existing) + itemQty(item);
      existing.qty = existing.maxQty ? Math.min(next, existing.maxQty) : next;
    }
  } else {
    items.push({ ...item, qty: item.kind === "product" ? itemQty(item) : undefined });
  }
  persist(items);
  return items;
}

export function setQty(slug: string, qty: number): CartItem[] {
  const items = read().map((i) => {
    if (i.slug !== slug || i.kind !== "product") return i;
    const capped = i.maxQty ? Math.min(qty, i.maxQty) : qty;
    return { ...i, qty: Math.max(1, capped) };
  });
  persist(items);
  return items;
}

export function removeFromCart(slug: string): CartItem[] {
  const items = read().filter((i) => i.slug !== slug);
  persist(items);
  return items;
}

export function clearCart() {
  persist([]);
}

export function cartCount(): number {
  return read().reduce((s, i) => s + itemQty(i), 0);
}

export function cartTotal(items?: CartItem[]): number {
  return (items ?? read()).reduce((s, i) => s + i.price * itemQty(i), 0);
}

export function hasPhysical(items?: CartItem[]): boolean {
  return (items ?? read()).some((i) => i.kind === "product" && i.physical !== false);
}

export function couponDiscount(total: number, code: string): number {
  if (code.trim().toUpperCase() === COUPON_CODE) {
    return Math.round((total * COUPON_PERCENT) / 100);
  }
  return 0;
}
