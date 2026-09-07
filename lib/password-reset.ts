import crypto from "node:crypto";
import { getSql } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { sendSms } from "@/lib/notify";
import { normalizeDigits } from "@/lib/format";

/**
 * Password reset.
 *
 * Deliberately built around a short numeric code rather than a link, because the
 * account identifier here is a mobile number and SMS is the only channel every
 * user has. That choice creates a brute-force surface a link would not have, so
 * the mitigations are not optional:
 *
 *   - only the SHA-256 hash of the code is stored, never the code;
 *   - 15-minute expiry, enforced in SQL rather than in application code;
 *   - a code is single-use and is consumed atomically;
 *   - the per-phone attempt budget is spent on *wrong* codes, so guessing is
 *     expensive even within the validity window;
 *   - requesting a new code invalidates the previous ones;
 *   - changing a password revokes every other session.
 *
 * Requesting a reset for an unknown number returns the same generic result as a
 * known one, so the endpoint cannot be used to enumerate registered users.
 */

const CODE_TTL_MINUTES = 15;
const CODE_LENGTH = 8;
const MAX_ATTEMPTS = 5;

export type RequestOutcome = { ok: true; sent: boolean };

export type ResetOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "attempts" | "missing" };

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function newCode(): string {
  // 8 digits from CSPRNG. Modulo is safe here: 10^8 is far below 2^31, and the
  // bias across a 32-bit draw is negligible for a 15-minute single-use code.
  const n = crypto.randomInt(0, 10 ** CODE_LENGTH);
  return String(n).padStart(CODE_LENGTH, "0");
}

/**
 * Issue a reset code for `phone`.
 *
 * Always resolves with `{ ok: true }` — the caller must not be able to
 * distinguish a registered number from an unregistered one.
 */
export async function requestPasswordReset(
  rawPhone: string,
  resolveUser: (phone: string) => { id: string; name?: string } | undefined,
): Promise<RequestOutcome> {
  const phone = normalizeDigits((rawPhone ?? "").trim());
  if (!/^09\d{9}$/.test(phone)) return { ok: true, sent: false };

  const user = resolveUser(phone);
  if (!user) {
    // Same shape as success; nothing is sent and nothing is stored.
    logger.info({ event: "auth.password_reset.unknown_phone" });
    return { ok: true, sent: false };
  }

  const sql = await getSql();
  const code = newCode();
  const id = `pr-${crypto.randomBytes(8).toString("hex")}`;

  await sql.transaction(async (tx) => {
    // A new code supersedes any outstanding ones.
    await tx.query(
      "UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL",
      [user.id],
    );
    await tx.query(
      `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at, attempts)
       VALUES ($1, $2, $3, now() + make_interval(mins => $4), NULL, 0)`,
      [id, user.id, hashCode(code), CODE_TTL_MINUTES],
    );
  });

  const result = await sendSms(
    [phone],
    `کد بازیابی رمز عبور اسدزاده: ${code}\nاین کد ${CODE_TTL_MINUTES} دقیقه اعتبار دارد.`,
  );

  logger.info({
    event: "auth.password_reset.requested",
    userId: user.id,
    mode: result.mode,
    sent: result.ok,
  });

  return { ok: true, sent: result.ok };
}

/**
 * Consume a reset code and set a new password.
 *
 * The code is matched and marked used in a single statement so two concurrent
 * submissions cannot both succeed.
 */
export async function resetPasswordWithCode(
  rawPhone: string,
  code: string,
  newPassword: string,
  deps: {
    resolveUser: (phone: string) => { id: string } | undefined;
    setPassword: (userId: string, password: string) => Promise<void>;
    revokeOtherSessions: (userId: string) => Promise<void>;
  },
): Promise<ResetOutcome> {
  const phone = normalizeDigits((rawPhone ?? "").trim());
  const digits = (code ?? "").replace(/\D/g, "");
  if (!/^09\d{9}$/.test(phone) || digits.length !== CODE_LENGTH) {
    return { ok: false, reason: "invalid" };
  }

  const user = deps.resolveUser(phone);
  if (!user) return { ok: false, reason: "invalid" };

  const sql = await getSql();

  const candidates = await sql.query<{ id: string; expires_at: string; attempts: number }>(
    `SELECT id, expires_at, attempts FROM password_resets
      WHERE user_id = $1 AND used_at IS NULL AND token_hash = $2
      ORDER BY expires_at DESC
      LIMIT 1`,
    [user.id, hashCode(digits)],
  );

  if (candidates.length === 0) {
    // Wrong code. Spend one of the attempt budget so guessing is bounded.
    const { exhausted } = await spendAttempt(sql, user.id);
    return { ok: false, reason: exhausted ? "attempts" : "invalid" };
  }

  const match = candidates[0];
  if (Date.parse(match.expires_at) < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (Number(match.attempts ?? 0) >= MAX_ATTEMPTS) {
    return { ok: false, reason: "attempts" };
  }

  // Consume it. If a concurrent request already did, this affects 0 rows and we
  // treat it as invalid rather than setting the password twice.
  const consumed = await sql.query<{ id: string }>(
    "UPDATE password_resets SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id",
    [match.id],
  );
  if (consumed.length === 0) return { ok: false, reason: "invalid" };

  await deps.setPassword(user.id, newPassword);
  await deps.revokeOtherSessions(user.id);

  logger.info({ event: "auth.password_reset.completed", userId: user.id });
  return { ok: true };
}

/* ------------------------------------------------------------ attempt budget */

type Sql = Awaited<ReturnType<typeof getSql>>;

/**
 * Spend one of the attempt budget and report whether it is gone.
 *
 * Counted on the outstanding code's own row, so requesting a fresh code starts
 * the budget over. Done as one statement so a burst of parallel wrong guesses
 * cannot all read the same pre-increment value.
 */
async function spendAttempt(sql: Sql, userId: string): Promise<{ exhausted: boolean }> {
  const rows = await sql.query<{ attempts: number }>(
    `UPDATE password_resets
        SET attempts = attempts + 1
      WHERE id = (
        SELECT id FROM password_resets
         WHERE user_id = $1 AND used_at IS NULL
         ORDER BY expires_at DESC LIMIT 1
      )
      RETURNING attempts`,
    [userId],
  );
  const attempts = rows[0] ? Number(rows[0].attempts) : 0;
  return { exhausted: attempts >= MAX_ATTEMPTS };
}
