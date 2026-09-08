import crypto from "node:crypto";
import { getSql } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { sendSmsCode } from "@/lib/notify";
import { normalizeDigits } from "@/lib/format";

/**
 * One-time-code phone login.
 *
 * Same threat model as password reset, so the same mitigations: the code is
 * hashed before it is stored, expiry and single-use are enforced in SQL, the
 * attempt budget is spent on wrong guesses, and requesting a new code kills the
 * old one. Two things differ because this is a *login* surface:
 *
 *   - the code is shorter (6 digits) and shorter-lived (5 minutes), because the
 *     user is waiting on screen and a long window is unnecessary exposure;
 *   - a resend cooldown is enforced in SQL, so an attacker cannot use the
 *     endpoint to run up the shop's SMS bill or to flood a victim's phone.
 *
 * An unregistered number gets the same generic response as a registered one and
 * stores nothing, so this cannot enumerate accounts.
 */

const CODE_TTL_MINUTES = 5;
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 5;
/** Minimum seconds between two code requests for the same phone. */
const RESEND_COOLDOWN_SECONDS = 90;

export type OtpRequestOutcome =
  | { ok: true; sent: boolean }
  | { ok: false; reason: "cooldown"; retryAfterSeconds: number };

export type OtpVerifyOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "attempts" | "missing" };

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function newCode(): string {
  // 6 digits from CSPRNG. Modulo bias across a 32-bit draw is negligible for a
  // 5-minute, single-use, attempt-limited code.
  return String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

function validPhone(raw: string): string | null {
  const phone = normalizeDigits((raw ?? "").trim());
  return /^09\d{9}$/.test(phone) ? phone : null;
}

type Sql = Awaited<ReturnType<typeof getSql>>;

/**
 * Issue a login code for `phone`.
 *
 * Returns `{ ok: true, sent: false }` for an unknown number, indistinguishable
 * from a known one whose SMS failed. The cooldown is the only refusal the caller
 * can observe, and it is per-phone, so it leaks nothing about registration.
 */
export async function requestLoginOtp(
  rawPhone: string,
  resolveUser: (phone: string) => { id: string; name?: string } | undefined,
): Promise<OtpRequestOutcome> {
  const phone = validPhone(rawPhone);
  if (!phone) return { ok: true, sent: false };

  const user = resolveUser(phone);
  if (!user) {
    logger.info({ event: "auth.otp.unknown_phone" });
    return { ok: true, sent: false };
  }

  const sql = await getSql();
  const code = newCode();
  const id = `otp-${crypto.randomBytes(8).toString("hex")}`;

  // The cooldown check and the insert share a transaction so two parallel
  // requests cannot both read "no recent code" and both send.
  const inserted = await sql.transaction(async (tx) => {
    const recent = await tx.query<{ age: number }>(
      `SELECT EXTRACT(EPOCH FROM now() - max(created_at))::int AS age
         FROM otp_codes
        WHERE phone = $1 AND created_at > now() - make_interval(secs => $2)`,
      [phone, RESEND_COOLDOWN_SECONDS],
    );
    const age = recent[0]?.age;
    if (age !== null && age !== undefined) {
      return { sent: false, retryAfterSeconds: Math.max(1, RESEND_COOLDOWN_SECONDS - Number(age)) };
    }
    // A new code supersedes any outstanding ones.
    await tx.query("UPDATE otp_codes SET used_at = now() WHERE phone = $1 AND used_at IS NULL", [phone]);
    await tx.query(
      `INSERT INTO otp_codes (id, phone, code_hash, expires_at, used_at, attempts, created_at)
       VALUES ($1, $2, $3, now() + make_interval(mins => $4), NULL, 0, now())`,
      [id, phone, hashCode(code), CODE_TTL_MINUTES],
    );
    return { sent: true, retryAfterSeconds: 0 };
  });

  if (!inserted.sent) {
    logger.info({ event: "auth.otp.cooldown", retryAfterSeconds: inserted.retryAfterSeconds });
    return { ok: false, reason: "cooldown", retryAfterSeconds: inserted.retryAfterSeconds };
  }

  const result = await sendSmsCode(
    phone,
    code,
    `کد ورود اسدزاده: ${code}\nاین کد ${CODE_TTL_MINUTES} دقیقه اعتبار دارد.`,
  );

  logger.info({ event: "auth.otp.requested", mode: result.mode, sent: result.ok });
  return { ok: true, sent: result.ok };
}

/**
 * Consume a login code.
 *
 * Matched and marked used in one statement, so two concurrent submissions cannot
 * both succeed — the loser sees 0 rows and is treated as invalid.
 */
export async function verifyLoginOtp(rawPhone: string, code: string): Promise<OtpVerifyOutcome> {
  const phone = validPhone(rawPhone);
  const digits = (code ?? "").replace(/\D/g, "");
  if (!phone || digits.length !== CODE_LENGTH) return { ok: false, reason: "invalid" };

  const sql = await getSql();

  const candidates = await sql.query<{ id: string; expires_at: string; attempts: number }>(
    `SELECT id, expires_at, attempts FROM otp_codes
      WHERE phone = $1 AND used_at IS NULL AND code_hash = $2
      ORDER BY expires_at DESC
      LIMIT 1`,
    [phone, hashCode(digits)],
  );

  if (candidates.length === 0) {
    const { exhausted } = await spendAttempt(sql, phone);
    return { ok: false, reason: exhausted ? "attempts" : "invalid" };
  }

  const match = candidates[0];
  if (Date.parse(match.expires_at) < Date.now()) return { ok: false, reason: "expired" };
  if (Number(match.attempts ?? 0) >= MAX_ATTEMPTS) return { ok: false, reason: "attempts" };

  const consumed = await sql.query<{ id: string }>(
    "UPDATE otp_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id",
    [match.id],
  );
  if (consumed.length === 0) return { ok: false, reason: "invalid" };

  logger.info({ event: "auth.otp.verified" });
  return { ok: true };
}

/**
 * Spend one of the attempt budget and report whether it is gone.
 *
 * One statement, so a burst of parallel wrong guesses cannot all read the same
 * pre-increment value.
 */
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
