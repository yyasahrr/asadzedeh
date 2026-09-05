/** Client-side cart (localStorage). Emits `az:cart` event on change. */

export interface CartItem {
  kind: "course" | "class";
  slug: string;
  title: string;
  price: number;
  image: string;
  meta?: string;
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

export function addToCart(item: CartItem): CartItem[] {
  const items = read();
  if (!items.some((i) => i.slug === item.slug)) items.push(item);
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
  return read().length;
}

export function cartTotal(items?: CartItem[]): number {
  return (items ?? read()).reduce((s, i) => s + i.price, 0);
}

export function couponDiscount(total: number, code: string): number {
  if (code.trim().toUpperCase() === COUPON_CODE) {
    return Math.round((total * COUPON_PERCENT) / 100);
  }
  return 0;
}
