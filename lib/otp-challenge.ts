import { signPayload, verifySigned } from "./auth";
import { safeNextPath } from "./auth-navigation";
import { normalizeDigits } from "./format";
import { OTP_CHALLENGE_TTL_SECONDS, OTP_CODE_TTL_SECONDS, OTP_RESEND_COOLDOWN_SECONDS } from "./otp-constants";

export { OTP_CHALLENGE_TTL_SECONDS, OTP_CODE_TTL_SECONDS, OTP_RESEND_COOLDOWN_SECONDS } from "./otp-constants";

export const OTP_CHALLENGE_COOKIE = "az_otp_challenge";
export interface OtpChallenge {
  phone: string;
  next: string;
  otpExpiresAt: number;
  resendAvailableAt: number;
  exp: number;
}

export function createOtpChallenge(phoneValue: string, nextValue: string, now = Date.now()): string {
  const phone = normalizeDigits(phoneValue.trim());
  if (!/^09\d{9}$/.test(phone)) throw new Error("invalid OTP challenge phone");
  return signPayload({
    phone,
    next: safeNextPath(nextValue, ""),
    otpExpiresAt: now + OTP_CODE_TTL_SECONDS * 1000,
    resendAvailableAt: now + OTP_RESEND_COOLDOWN_SECONDS * 1000,
    exp: now + OTP_CHALLENGE_TTL_SECONDS * 1000,
  });
}

export function readOtpChallenge(token?: string | null): OtpChallenge | null {
  if (!token) return null;
  const parsed = verifySigned<Record<string, unknown>>(token);
  if (!parsed) return null;
  const phone = normalizeDigits(String(parsed.phone ?? ""));
  const next = safeNextPath(String(parsed.next ?? ""), "");
  const otpExpiresAt = Number(parsed.otpExpiresAt);
  const resendAvailableAt = Number(parsed.resendAvailableAt);
  const exp = Number(parsed.exp);
  if (!/^09\d{9}$/.test(phone) || !Number.isFinite(otpExpiresAt) || !Number.isFinite(resendAvailableAt) || !Number.isFinite(exp)) return null;
  return { phone, next, otpExpiresAt, resendAvailableAt, exp };
}

export function maskIranianPhone(phone: string): string {
  const normalized = normalizeDigits(phone);
  return /^09\d{9}$/.test(normalized) ? `${normalized.slice(0, 4)}***${normalized.slice(-4)}` : "شماره ثبت‌شده";
}
