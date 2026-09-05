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

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Convert Persian/Arabic digits to English: «۲٬۸۵۰٬۰۰۰» -> usable number string. */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

/** Parse a price string possibly containing Persian digits/separators. */
export function parsePrice(input: string): number {
  const n = Number(normalizeDigits(input).replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Today's date in Persian, e.g. «۱۴ شهریور ۱۴۰۵». */
export function faToday(): string {
  return new Date().toLocaleDateString("fa-IR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
