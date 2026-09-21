import { getSql } from "./client";

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
