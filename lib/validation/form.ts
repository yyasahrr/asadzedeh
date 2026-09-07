import { z } from "zod";
import { logger } from "@/lib/logger";
import { normalizeDigits, stripControlCharacters } from "./schema";

/**
 * Zod-backed FormData readers.
 *
 * The admin, instructor and SEO panels read ~500 fields straight out of
 * `FormData`. Each of them used to hand-roll a `str()`/`num()`/`bool()` that
 * silently coerced anything into a default. These do the same job but the
 * coercion is a real Zod schema: bounds are declared, and a value that fails
 * validation is logged rather than quietly accepted.
 */

const MAX_TEXT = 20_000;

const textSchema = (max: number) =>
  z
    .unknown()
    .transform((v) => (typeof v === "string" ? v : v == null ? "" : String(v)))
    .transform(stripControlCharacters)
    .transform((v) => v.trim())
    .pipe(z.string().max(max));

const numberSchema = (opts: { min: number; max: number; integer: boolean }) =>
  z
    .unknown()
    .transform((v) => (typeof v === "string" ? normalizeDigits(v).replace(/[^\d.-]/g, "") : v))
    .transform((v) => (v === "" || v == null ? NaN : Number(v)))
    .refine((v) => Number.isFinite(v), "not a number")
    .refine((v) => (opts.integer ? Number.isInteger(v) : true), "not an integer")
    .refine((v) => v >= opts.min, "below minimum")
    .refine((v) => v <= opts.max, "above maximum");

const booleanSchema = z.unknown().transform(
  (v) => v === "on" || v === "1" || v === "true" || v === true,
);

/**
 * Read a trimmed string. Values longer than `max` are truncated, never
 * accepted whole: a 5 MB textarea must not reach the database.
 */
export function str(fd: FormData, key: string, max = MAX_TEXT): string {
  const parsed = textSchema(max).safeParse(fd.get(key));
  if (!parsed.success) {
    logger.warn({ event: "validation.rejected", field: key, reason: "text too long" });
    return "";
  }
  return parsed.data;
}

/**
 * Read a positive number. Invalid input falls back to `fallback` — the same
 * behaviour the panels have always had — but it is now logged.
 */
export function num(fd: FormData, key: string, fallback = 0, max = 10_000_000_000): number {
  const parsed = numberSchema({ min: 1, max, integer: true }).safeParse(fd.get(key));
  if (!parsed.success || parsed.data <= 0) {
    if (fd.get(key) != null && fd.get(key) !== "") {
      logger.warn({ event: "validation.rejected", field: key, reason: "not a positive integer" });
    }
    return fallback;
  }
  return parsed.data;
}

/** Read a number where zero is meaningful (stock, discounts, coordinates). */
export function numAllowZero(
  fd: FormData,
  key: string,
  fallback = 0,
  opts: { min?: number; max?: number; integer?: boolean } = {},
): number {
  const parsed = numberSchema({
    min: opts.min ?? 0,
    max: opts.max ?? 10_000_000_000,
    integer: opts.integer ?? true,
  }).safeParse(fd.get(key));
  if (!parsed.success) {
    if (fd.get(key) != null && fd.get(key) !== "") {
      logger.warn({ event: "validation.rejected", field: key, reason: "not a number in range" });
    }
    return fallback;
  }
  return parsed.data;
}

/** Checkbox presence. Only the explicit truthy spellings count. */
export function bool(fd: FormData, key: string): boolean {
  return booleanSchema.parse(fd.get(key));
}

/** Read a value that must be one of a fixed set, e.g. a role or a status. */
export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[]): T | undefined {
  const value = str(fd, key);
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}
