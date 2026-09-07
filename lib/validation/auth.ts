import { z } from "zod";
import { faNum, normalizeDigits } from "./schema";

/**
 * Validation for the authentication boundary.
 *
 * These schemas define what the login, registration and 2FA forms are allowed
 * to say, in one place, so the rules cannot drift between the client hint and
 * the server check.
 */

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

/** A password: length-bounded so hashing cannot be used as a DoS vector. */
export const zPassword = z
  .string({ error: "گذرواژه الزامی است" })
  .min(MIN_PASSWORD_LENGTH, `گذرواژه باید حداقل ${faNum(MIN_PASSWORD_LENGTH)} نویسه باشد`)
  .max(MAX_PASSWORD_LENGTH, "گذرواژه بیش از حد طولانی است");

function normalizePhoneInput(value: unknown): string {
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);
  const digits = normalizeDigits(raw).replace(/[\s()-]/g, "");
  return digits.startsWith("+98") ? `0${digits.slice(3)}` : digits;
}

/** Iranian mobile number, normalised to 09xxxxxxxxx. */
export const zPhoneNumber = z.preprocess(
  normalizePhoneInput,
  z.string().regex(/^09\d{9}$/, "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد"),
);

export const zDisplayName = z
  .string()
  .transform((v) => v.replace(/[\u0000-\u001f\u007f]/g, "").trim())
  .pipe(z.string().min(2, "نام را وارد کنید").max(80, "نام بیش از حد طولانی است"));

/** TOTP codes are 6 digits; recovery codes are the XXXX-XXXX form from lib/totp.ts. */
export const zTotpCode = z.preprocess(
  (v) => normalizeDigits(typeof v === "string" ? v : "").replace(/\s/g, ""),
  z.string().regex(/^\d{6}$/, "کد شش‌رقمی را وارد کنید"),
);

export const zRecoveryCode = z.preprocess(
  (v) => normalizeDigits(typeof v === "string" ? v : "").replace(/\s/g, "").toUpperCase(),
  z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "کد بازیابی معتبر نیست"),
);

/**
 * A post-login redirect target. Only a same-site absolute path is acceptable —
 * an open redirect here would turn the login form into a phishing launcher.
 */
export const zNextPath = z
  .string()
  .default("")
  .transform((v) => v.trim())
  .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")), {
    message: "مسیر بازگشت نامعتبر است",
  });

export const loginSchema = z.object({
  phone: zPhoneNumber,
  password: z.string().min(1, "گذرواژه الزامی است").max(MAX_PASSWORD_LENGTH),
  next: zNextPath,
});

export const registerSchema = z.object({
  name: zDisplayName,
  phone: zPhoneNumber,
  password: zPassword,
});

export const mfaSchema = z.object({
  code: zTotpCode.or(zRecoveryCode),
  next: zNextPath,
});

/** Eight digits, matching what lib/password-reset.ts issues. */
export const zResetCode = z.preprocess(
  (v) => String(v ?? "").replace(/\\D/g, ""),
  z.string().regex(/^\\d{8}$/, "کد بازیابی باید ۸ رقم باشد"),
);

export const resetPasswordSchema = z.object({
  phone: zPhoneNumber,
  code: zResetCode,
  password: zPassword,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MfaInput = z.infer<typeof mfaSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
