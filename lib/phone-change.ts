import { signPayload, verifySigned } from "./auth";
import { normalizeDigits } from "./format";
import { OTP_CHALLENGE_TTL_SECONDS, OTP_CODE_TTL_SECONDS, OTP_RESEND_COOLDOWN_SECONDS } from "./otp-constants";

export const PHONE_CHANGE_COOKIE = "az_phone_change";

export interface PhoneChangeChallenge {
  userId: string;
  oldPhone: string;
  newPhone: string;
  otpExpiresAt: number;
  resendAvailableAt: number;
  exp: number;
}

export function normalizeIranianMobile(value: unknown): string {
  const digits = normalizeDigits(String(value ?? "").trim()).replace(/[\s()-]/g, "");
  return digits.startsWith("+98") ? `0${digits.slice(3)}` : digits;
}

export function createPhoneChangeChallenge(userId: string, oldValue: string, newValue: string, now = Date.now()): string {
  const oldPhone = normalizeIranianMobile(oldValue);
  const newPhone = normalizeIranianMobile(newValue);
  if (!userId || !/^09\d{9}$/.test(oldPhone) || !/^09\d{9}$/.test(newPhone) || oldPhone === newPhone) {
    throw new Error("invalid phone change challenge");
  }
  return signPayload({
    userId, oldPhone, newPhone,
    otpExpiresAt: now + OTP_CODE_TTL_SECONDS * 1000,
    resendAvailableAt: now + OTP_RESEND_COOLDOWN_SECONDS * 1000,
    exp: now + OTP_CHALLENGE_TTL_SECONDS * 1000,
  });
}

export function readPhoneChangeChallenge(token?: string | null): PhoneChangeChallenge | null {
  if (!token) return null;
  const value = verifySigned<Record<string, unknown>>(token);
  if (!value) return null;
  const parsed = {
    userId: String(value.userId ?? ""), oldPhone: normalizeIranianMobile(value.oldPhone), newPhone: normalizeIranianMobile(value.newPhone),
    otpExpiresAt: Number(value.otpExpiresAt), resendAvailableAt: Number(value.resendAvailableAt), exp: Number(value.exp),
  };
  if (!parsed.userId || !/^09\d{9}$/.test(parsed.oldPhone) || !/^09\d{9}$/.test(parsed.newPhone) || parsed.oldPhone === parsed.newPhone ||
      !Number.isFinite(parsed.otpExpiresAt) || !Number.isFinite(parsed.resendAvailableAt) || !Number.isFinite(parsed.exp)) return null;
  return parsed;
}

export function maskPhone(phone: string): string {
  const value = normalizeIranianMobile(phone);
  return /^09\d{9}$/.test(value) ? `${value.slice(0, 4)}***${value.slice(-4)}` : "شماره ثبت‌شده";
}
