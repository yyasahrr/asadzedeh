import { getClasses, getCourses, getLearningPath, getLearningPathFinalPrice, getProducts } from "./store";
import type { CartItem } from "./cart";
import type { OrderLine } from "./types";

/**
 * Turn a client cart into verified server-side order lines.
 *
 * The browser only ever supplies identifiers (`kind`, `slug`, `qty`). Every
 * price, title and availability flag in the returned lines is re-read from the
 * store here, so a tampered cart that posts `price: 1` cannot change what it
 * pays. This is deliberately a pure function of the cart + the store, with no
 * `next/*` imports, so it can be unit-tested directly.
 */
export function buildLines(items: CartItem[]): { lines: OrderLine[]; problems: string[] } {
  const courses = getCourses();
  const classes = getClasses();
  const products = getProducts();
  const lines: OrderLine[] = [];
  const problems: string[] = [];

  for (const i of items) {
    if (i.kind === "course") {
      const c = courses.find((x) => x.slug === i.slug);
      if (!c) {
        problems.push(`دوره «${i.title}» موجود نیست`);
        continue;
      }
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
      lines.push({ kind: p.kind === "preorder" ? "preorder" : "product", slug: p.slug, title: p.title, price: p.price, qty });
    }
  }

  return { lines, problems };
}

/** Subtotal of already-verified lines. Never called with client-supplied prices. */
export function linesSubtotal(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.qty, 0);
}
