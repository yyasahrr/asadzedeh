import { z } from "zod";

/**
 * Shared Zod primitives for Persian-first form input.
 *
 * Every value that crosses into the app from a browser passes through one of
 * these, so length limits, integer-ness and ranges are enforced in exactly one
 * place instead of being re-derived per action.
 */

/** Persian and Arabic-Indic digits arrive from RTL number inputs. */
const DIGITS = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";

export function normalizeDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => String(DIGITS.indexOf(d) % 10));
}

/** Render a number with Persian digits, for user-facing messages. */
export function faNum(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export function stripControlCharacters(input: string): string {
  return input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

/** Trimmed text with a hard ceiling. Never `null`, never a control character. */
export const zText = (max: number) =>
  z
    .string()
    .transform(stripControlCharacters)
    .transform((v) => v.trim())
    .pipe(z.string().max(max, `بیش از ${faNum(max)} نویسه مجاز نیست`));

export const zOptionalText = (max: number) => zText(max).default("");

/** A URL slug: lowercase latin, digits, dash and underscore. */
export const zSlug = z
  .string()
  .trim()
  .max(120, "اسلاگ بیش از حد طولانی است")
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "اسلاگ باید با حروف کوچک انگلیسی، عدد، - یا _ باشد");

/** Iranian mobile number, normalised to 09xxxxxxxxx. */
export const zPhone = z
  .string()
  .transform((v) => normalizeDigits(v).replace(/[\s-]/g, ""))
  .refine((v) => /^09\d{9}$/.test(v) || /^\+989\d{9}$/.test(v), "شماره موبایل معتبر نیست");

/** Money is an integer number of Toman. Rials only exist at the gateway edge. */
export const zToman = z.coerce
  .number({ error: "مبلغ باید عدد باشد" })
  .int("مبلغ باید عدد صحیح باشد")
  .nonnegative("مبلغ نمی‌تواند منفی باشد")
  .max(10_000_000_000, "مبلغ بیش از حد مجاز است");

export const zCount = (max: number) =>
  z.coerce
    .number({ error: "عدد معتبر نیست" })
    .int("باید عدد صحیح باشد")
    .nonnegative("نمی‌تواند منفی باشد")
    .max(max, `بیش از ${faNum(max)} مجاز نیست`);

export const zPercent = z.coerce
  .number({ error: "درصد معتبر نیست" })
  .min(0, "درصد نمی‌تواند منفی باشد")
  .max(100, "درصد نمی‌تواند بیش از ۱۰۰ باشد");

export const zLatitude = z.coerce.number().min(-90).max(90);
export const zLongitude = z.coerce.number().min(-180).max(180);

/** Postal code: 5 or 10 digits. */
export const zPostalCode = z.preprocess(
  (v) => (typeof v === "string" ? normalizeDigits(v).replace(/[\s-]/g, "") : v),
  z.string().regex(/^(\d{5}|\d{10})$/, "کد پستی باید ۵ یا ۱۰ رقم باشد"),
);

export type ValidationIssue = { field: string; message: string };

export interface ValidationFailure {
  ok: false;
  issues: ValidationIssue[];
  /** First message, for simple single-field forms. */
  message: string;
}

export type ValidationResult<T> = { ok: true; data: T } | ValidationFailure;

/** Turn a ZodError into something a Persian UI can render field by field. */
export function toIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "_",
    message: issue.message,
  }));
}

export function validate<T>(schema: z.ZodType<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const issues = toIssues(result.error);
  return { ok: false, issues, message: issues[0]?.message ?? "ورودی نامعتبر است" };
}

/**
 * Reject anything that is not a plain object.
 *
 * Server Actions receive `unknown`. Without this, `Object.keys(undefined)` and
 * prototype-polluted payloads become runtime errors deep in the action.
 */
export const zRecord = z.record(z.string(), z.unknown());
