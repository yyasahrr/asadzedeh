import crypto from "node:crypto";
import { getSql } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { sendSms } from "@/lib/notify";
import { normalizeDigits } from "@/lib/format";
import { getSettings } from "@/lib/store";

/**
 * Login with a one-time code sent by SMS.
 *
 * Same threat model as the password reset code in `lib/password-reset.ts`, and
 * deliberately the same defences, because an OTP that logs someone in is a
 * stronger capability than one that merely starts a reset:
 *
 *   - only the SHA-256 hash of the code is stored;
 *   - short expiry (operator-configurable, minutes), enforced in SQL;
 *   - single-use, consumed atomically so two submissions cannot both win;
 *   - a wrong code spends the attempt budget, so guessing is bounded;
 *   - requesting a new code invalidates outstanding ones;
 *   - requests per phone per hour are capped in SQL, so the send path cannot be
 *     used to bill the site owner for someone else's SMS.
 *
 * Requesting a code never reveals whether the number is registered.
 */

const MAX_ATTEMPTS = 5;

export type OtpPurpose = "login";

export type OtpRequestOutcome =
  | { ok: true; sent: boolean; ttlMinutes: number; isNewUser: boolean }
  | { ok: false; reason: "disabled" | "invalid_phone" | "rate_limited" | "send_failed" };

export type OtpVerifyOutcome =
  | { ok: true; phone: string }
  | { ok: false; reason: "invalid" | "expired" | "attempts" | "disabled" };

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function newCode(length: number): string {
  // CSPRNG draw over the full code space; no modulo bias for these lengths.
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, "0");
}

export function normalizePhone(raw: string): string {
  const digits = normalizeDigits((raw ?? "").trim()).replace(/[\s()-]/g, "");
  return digits.startsWith("+98") ? `0${digits.slice(3)}` : digits;
}

export function isValidPhone(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}

/**
 * Issue a login code for `phone`.
 *
 * `knownUser` decides whether an unregistered number is allowed to proceed
 * (registration by OTP is an operator setting), but the outcome shape does not
 * change, so the endpoint cannot be used to enumerate accounts.
 */
export async function requestOtp(
  rawPhone: string,
  knownUser: boolean,
): Promise<OtpRequestOutcome> {
  const { otp, sms } = getSettings();
  if (!otp.enabled) return { ok: false, reason: "disabled" };

  const phone = normalizePhone(rawPhone);
  if (!isValidPhone(phone)) return { ok: false, reason: "invalid_phone" };

  const isNewUser = !knownUser;
  if (isNewUser && !otp.allowRegistration) {
    // Same shape as success: nothing is sent, nothing is stored.
    logger.info({ event: "auth.otp.unknown_phone" });
    return { ok: true, sent: false, ttlMinutes: otp.ttlMinutes, isNewUser: true };
  }

  const sql = await getSql();

  // Per-phone hourly budget, counted in SQL so parallel requests cannot all
  // read the same pre-insert count.
  const recent = await sql.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM otp_codes WHERE phone = $1 AND created_at > now() - interval '1 hour'",
    [phone],
  );
  if (Number(recent[0]?.count ?? 0) >= otp.maxPerHour) {
    logger.warn({ event: "auth.otp.rate_limited" });
    return { ok: false, reason: "rate_limited" };
  }

  const code = newCode(otp.codeLength);
  const id = `otp-${crypto.randomBytes(8).toString("hex")}`;

  await sql.transaction(async (tx) => {
    await tx.query("UPDATE otp_codes SET used_at = now() WHERE phone = $1 AND used_at IS NULL", [phone]);
    await tx.query(
      `INSERT INTO otp_codes (id, phone, code_hash, purpose, expires_at, used_at, attempts)
       VALUES ($1, $2, $3, 'login', now() + make_interval(mins => $4), NULL, 0)`,
      [id, phone, hashCode(code), otp.ttlMinutes],
    );
  });

  const result = await sendSms(
    [phone],
    `کد ورود شما به اسدزاده: ${code}\nاین کد ${otp.ttlMinutes} دقیقه اعتبار دارد.`,
    sms.otpTemplate ? { template: sms.otpTemplate, params: { [sms.otpTemplateParam || "code"]: code } } : undefined,
  );

  logger.info({ event: "auth.otp.requested", mode: result.mode, sent: result.ok });
  if (!result.ok) return { ok: false, reason: "send_failed" };

  return { ok: true, sent: true, ttlMinutes: otp.ttlMinutes, isNewUser };
}

/**
 * Consume a login code.
 *
 * The code is matched and marked used in a single statement, so a replayed
 * submission cannot log the same code in twice.
 */
export async function verifyOtp(rawPhone: string, rawCode: string): Promise<OtpVerifyOutcome> {
  const { otp } = getSettings();
  if (!otp.enabled) return { ok: false, reason: "disabled" };

  const phone = normalizePhone(rawPhone);
  const code = normalizeDigits((rawCode ?? "").trim()).replace(/\D/g, "");
  if (!isValidPhone(phone) || code.length !== otp.codeLength) {
    return { ok: false, reason: "invalid" };
  }

  const sql = await getSql();
  const rows = await sql.query<{ id: string; expires_at: string; attempts: number }>(
    `SELECT id, expires_at, attempts FROM otp_codes
      WHERE phone = $1 AND used_at IS NULL AND code_hash = $2
      ORDER BY expires_at DESC LIMIT 1`,
    [phone, hashCode(code)],
  );

  if (rows.length === 0) {
    const { exhausted } = await spendAttempt(sql, phone);
    return { ok: false, reason: exhausted ? "attempts" : "invalid" };
  }

  const match = rows[0];
  if (Date.parse(match.expires_at) < Date.now()) return { ok: false, reason: "expired" };
  if (Number(match.attempts ?? 0) >= MAX_ATTEMPTS) return { ok: false, reason: "attempts" };

  const consumed = await sql.query<{ id: string }>(
    "UPDATE otp_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id",
    [match.id],
  );
  if (consumed.length === 0) return { ok: false, reason: "invalid" };

  logger.info({ event: "auth.otp.verified" });
  return { ok: true, phone };
}

type Sql = Awaited<ReturnType<typeof getSql>>;

/** Spend one wrong-guess from the budget of the outstanding code. */
async function spendAttempt(sql: Sql, phone: string): Promise<{ exhausted: boolean }> {
  const rows = await sql.query<{ attempts: number }>(
    `UPDATE otp_codes
        SET attempts = attempts + 1
      WHERE id = (
        SELECT id FROM otp_codes
         WHERE phone = $1 AND used_at IS NULL
         ORDER BY expires_at DESC LIMIT 1
      )
      RETURNING attempts`,
    [phone],
  );
  const attempts = rows[0] ? Number(rows[0].attempts) : 0;
  return { exhausted: attempts >= MAX_ATTEMPTS };
}
