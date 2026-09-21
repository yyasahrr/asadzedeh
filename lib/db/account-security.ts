import { getSql } from "./client";

export type OwnerRecoveryResult = "changed" | "replay-or-stale";

/** Atomically replace the login phone and retain only the session performing it. */
export async function changeUserPhoneAtomic(input: { userId: string; oldPhone: string; newPhone: string; currentSessionToken: string }): Promise<boolean> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const updated = await tx.query<{ id: string }>(
      `UPDATE users
          SET phone = $3,
              payload = jsonb_set(payload, '{phone}', to_jsonb($3::text), true),
              updated_at = now()
        WHERE id = $1 AND phone = $2
          AND NOT EXISTS (SELECT 1 FROM users other WHERE other.phone = $3 AND other.id <> $1)
      RETURNING id`,
      [input.userId, input.oldPhone, input.newPhone],
    );
    if (updated.length !== 1) return false;
    await tx.query("DELETE FROM sessions WHERE user_id = $1 AND token <> $2", [input.userId, input.currentSessionToken]);
    return true;
  });
}

/** TOTP-authorized owner phone recovery. The accepted TOTP step is consumed in the same transaction. */
export async function changeOwnerPhoneWithTotpAtomic(input: {
  userId: string; oldPhone: string; newPhone: string; currentSessionToken: string; totpStep: number;
}): Promise<OwnerRecoveryResult> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const updated = await tx.query<{ id: string }>(
      `UPDATE users
          SET phone = $3,
              payload = jsonb_set(
                jsonb_set(payload, '{phone}', to_jsonb($3::text), true),
                '{totp,lastStep}', to_jsonb($4::bigint), true
              ),
              updated_at = now()
        WHERE id = $1 AND phone = $2 AND role = 'super_admin'
          AND COALESCE((payload->>'disabled')::boolean, false) = false
          AND COALESCE((payload #>> '{totp,lastStep}')::bigint, 0) < $4
          AND NOT EXISTS (SELECT 1 FROM users other WHERE other.phone = $3 AND other.id <> $1)
      RETURNING id`,
      [input.userId, input.oldPhone, input.newPhone, input.totpStep],
    );
    if (updated.length !== 1) return "replay-or-stale";
    await tx.query("DELETE FROM sessions WHERE user_id = $1 AND token <> $2", [input.userId, input.currentSessionToken]);
    return "changed";
  });
}

/** TOTP-authorized owner password recovery with lock reset and atomic replay protection. */
export async function resetOwnerPasswordWithTotpAtomic(input: {
  userId: string; passwordHash: string; currentSessionToken: string; totpStep: number;
}): Promise<OwnerRecoveryResult> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const updated = await tx.query<{ id: string }>(
      `UPDATE users
          SET password_hash = $2,
              locked_until = NULL,
              payload = jsonb_set(
                jsonb_set(
                  jsonb_set(payload - 'lockedUntil', '{failedLogins}', '0'::jsonb, true),
                  '{passwordHash}', to_jsonb($2::text), true
                ),
                '{totp,lastStep}', to_jsonb($3::bigint), true
              ),
              updated_at = now()
        WHERE id = $1 AND role = 'super_admin'
          AND COALESCE((payload->>'disabled')::boolean, false) = false
          AND COALESCE((payload #>> '{totp,lastStep}')::bigint, 0) < $3
      RETURNING id`,
      [input.userId, input.passwordHash, input.totpStep],
    );
    if (updated.length !== 1) return "replay-or-stale";
    await tx.query("DELETE FROM sessions WHERE user_id = $1 AND token <> $2", [input.userId, input.currentSessionToken]);
    return "changed";
  });
}
