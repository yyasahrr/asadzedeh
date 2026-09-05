/** Persian formatting helpers — single source of truth for numbers & prices. */

const faNumber = new Intl.NumberFormat("fa-IR");
const faPrice = new Intl.NumberFormat("fa-IR");

export function toFa(value: number | string): string {
  if (typeof value === "string") return value.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
  return faNumber.format(value);
}

/** e.g. 2850000 -> «۲٬۸۵۰٬۰۰۰ تومان» */
export function formatPrice(value: number): string {
  return `${faPrice.format(value)} تومان`;
}

/** Compact price for cards, e.g. «۲٫۸۵ م تومان» */
export function formatPriceCompact(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    const rounded = Number.isInteger(m) ? m.toString() : m.toFixed(1);
    return `${toFa(rounded.replace(".", "٫"))} م تومان`;
  }
  return `${faPrice.format(value)} تومان`;
}

export function formatRating(value: number): string {
  return toFa(value.toFixed(1).replace(".", "٫"));
}
