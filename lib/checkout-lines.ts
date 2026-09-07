import { getClasses, getCourses, getLearningPath, getLearningPathFinalPrice, getProducts } from "./store";
import type { CartItem } from "./cart";
import type { OrderLine } from "./types";

/** An item whose price moved since the shopper saw it. */
export interface PriceChange {
  kind: CartItem["kind"];
  slug: string;
  title: string;
  /** What the cart claimed. Never used to charge anything. */
  expected: number;
  /** What the store says now — the amount actually charged. */
  actual: number;
}

export interface BuiltLines {
  lines: OrderLine[];
  problems: string[];
  priceChanges: PriceChange[];
}

/**
 * Turn a client cart into verified server-side order lines.
 *
 * The browser only ever supplies identifiers (`kind`, `slug`, `qty`). Every
 * price, title and availability flag in the returned lines is re-read from the
 * store here, so a tampered cart that posts `price: 1` cannot change what it
 * pays. This is deliberately a pure function of the cart + the store, with no
 * `next/*` imports, so it can be unit-tested directly.
 */
export function buildLines(items: CartItem[]): BuiltLines {
  const courses = getCourses();
  const classes = getClasses();
  const products = getProducts();
  const lines: OrderLine[] = [];
  const problems: string[] = [];
  const priceChanges: PriceChange[] = [];

  /**
   * Record when the price the shopper saw no longer matches the catalogue.
   *
   * The client price is never used to charge anything — that would let a
   * tampered cart pay 1 toman. But silently charging a different figure than
   * the one on screen is its own failure, so the difference is reported and
   * checkout stops until the shopper confirms the new amount.
   *
   * Only a real, positive, numeric cart price counts: an absent or zero price
   * means the cart predates this field, not that everything got cheaper.
   */
  const notePrice = (kind: CartItem["kind"], slug: string, title: string, expected: unknown, actual: number) => {
    const claimed = typeof expected === "number" ? expected : Number(expected);
    if (!Number.isFinite(claimed) || claimed <= 0) return;
    if (claimed === actual) return;
    priceChanges.push({ kind, slug, title, expected: claimed, actual });
  };

  for (const i of items) {
    if (i.kind === "course") {
      const c = courses.find((x) => x.slug === i.slug);
      if (!c) {
        problems.push(`دوره «${i.title}» موجود نیست`);
        continue;
      }
      notePrice("course", c.slug, c.title, i.price, c.price);
      lines.push({ kind: "course", slug: c.slug, title: c.title, price: c.price, qty: 1 });
    } else if (i.kind === "class") {
      const k = classes.find((x) => x.slug === i.slug);
      if (!k) {
        problems.push(`کلاس «${i.title}» موجود نیست`);
        continue;
      }
      if (k.remaining - (k.reservedSeats ?? 0) <= 0) {
        problems.push(`ظرفیت «${k.title}» تکمیل شده است`);
      } else {
        notePrice("class", k.slug, k.title, i.price, k.price);
        lines.push({ kind: "class", slug: k.slug, title: k.title, price: k.price, qty: 1 });
      }
    } else if (i.kind === "learning_path") {
      const lp = getLearningPath(i.slug);
      if (!lp || !lp.active) {
        problems.push(`مسیر «${i.title}» موجود نیست`);
        continue;
      }
      // Server-side price calculation — client price is ignored.
      const serverPrice = getLearningPathFinalPrice(lp);
      notePrice("learning_path", lp.slug, lp.title, i.price, serverPrice);
      lines.push({ kind: "learning_path", slug: lp.slug, title: lp.title, price: serverPrice, qty: 1 });
    } else if (i.kind === "product") {
      const p = products.find((x) => x.slug === i.slug && x.active);
      if (!p) {
        problems.push(`«${i.title}» دیگر موجود نیست`);
        continue;
      }
      const qty = Math.max(1, Math.min(Number(i.qty) || 1, 99));
      const available = p.stock - (p.reservedStock ?? 0);
      if (p.kind === "physical" && !p.allowBackorder && available < qty) {
        problems.push(available > 0 ? `از «${p.title}» فقط ${available} عدد موجود است` : `«${p.title}» ناموجود است`);
        continue;
      }
      notePrice("product", p.slug, p.title, i.price, p.price);
      lines.push({ kind: p.kind === "preorder" ? "preorder" : "product", slug: p.slug, title: p.title, price: p.price, qty });
    }
  }

  return { lines, problems, priceChanges };
}

/** Subtotal of already-verified lines. Never called with client-supplied prices. */
export function linesSubtotal(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.qty, 0);
}
