/**
 * Monetary contract for the whole system.
 *
 * Unit: TOMAN (integer). Never float.
 * Example: 1,850,000 Toman is stored as 1850000.
 *
 * Zarinpal expects Rial: amountRial = toman * 10. Conversion happens only at the gateway boundary.
 */

export const CURRENCY = "TOMAN" as const;
export type Currency = typeof CURRENCY;

export function toman(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function tomanToRial(amountToman: number): number {
  return toman(amountToman) * 10;
}

export function assertMoney(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Price must be a non-negative integer Toman amount");
  }
  return value;
}
