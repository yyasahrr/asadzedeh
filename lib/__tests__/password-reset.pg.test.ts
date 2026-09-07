import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSafeTestUrl, startTestDatabase, type TestDatabase } from "./helpers/pg";

/**
 * Password reset.
 *
 * The reset identifier is an 8-digit SMS code, which makes brute force the main
 * threat a magic link would not have. These tests pin the mitigations: the code
 * is stored hashed, it is single-use, it expires, the attempt budget is bounded,
 * and an unknown phone number is indistinguishable from a known one.
 */

let db: TestDatabase;
let sql: Awaited<ReturnType<typeof import("@/lib/db/client").getSql>>;
let pr: typeof import("@/lib/password-reset");

const USER = { id: "u-reset", phone: "09121112233" };

const resolveUser = (phone: string) => (phone === USER.phone ? USER : undefined);

beforeAll(async () => {
  db = await startTestDatabase();
  assertSafeTestUrl(db.url);

  Object.assign(process.env, { NODE_ENV: "test", DATABASE_URL: db.url, APP_SECRET: "test-secret-for-ci-only-0123456789" });

  const client = await import("@/lib/db/client");
  const { runMigrations } = await import("@/lib/db/migrate");
  sql = await client.getSql();
  expect(sql.kind).toBe("postgres");
  await runMigrations();

  pr = await import("@/lib/password-reset");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

beforeEach(async () => {
  await sql.execute("DELETE FROM password_resets");
  // password_resets.user_id is a real FK to users, so the subject must exist.
  await sql.query(
    `INSERT INTO users (id, phone, password_hash, role, payload)
     VALUES ($1, $2, 'salt:hash', 'student', '{}'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [USER.id, USER.phone],
  );
});

const row = async () =>
  (await sql.query<{ token_hash: string; used_at: string | null; attempts: string; expires_at: string }>(
    "SELECT token_hash, used_at, attempts::text AS attempts, expires_at FROM password_resets ORDER BY expires_at DESC LIMIT 1",
  ))[0];

/** Issue a code and recover the plaintext by matching hashes. */
async function issueAndReadCode(): Promise<string> {
  const sms = vi.spyOn(await import("@/lib/notify"), "sendSms");
  const result = await pr.requestPasswordReset(USER.phone, resolveUser);
  expect(result.ok).toBe(true);
  const message = sms.mock.calls.at(-1)?.[1] ?? "";
  const code = (message.match(/\d{8}/) ?? [""])[0];
  sms.mockRestore();
  return code;
}

const deps = (record: { userId?: string; password?: string; revoked?: boolean }) => ({
  resolveUser,
  setPassword: async (userId: string, password: string) => {
    record.userId = userId;
    record.password = password;
  },
  revokeOtherSessions: async () => {
    record.revoked = true;
  },
});

describe("requestPasswordReset", () => {
  it("stores a hash of the code, never the code itself", async () => {
    const code = await issueAndReadCode();
    expect(code).toMatch(/^\d{8}$/);

    const r = await row();
    expect(r.token_hash).not.toBe(code);
    expect(r.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(r.used_at).toBeNull();
  });

  it("is indistinguishable for an unregistered number", async () => {
    const result = await pr.requestPasswordReset("09129999999", resolveUser);
    // Same ok:true as a known number, but nothing is stored and nothing is sent.
    expect(result).toEqual({ ok: true, sent: false });

    const count = await sql.query<{ n: string }>("SELECT count(*)::text AS n FROM password_resets");
    expect(Number(count[0].n)).toBe(0);
  });

  it("rejects a malformed number without storing anything", async () => {
    for (const bad of ["", "12345", "0912", "not-a-phone"]) {
      const result = await pr.requestPasswordReset(bad, resolveUser);
      expect(result.sent).toBe(false);
    }
    const count = await sql.query<{ n: string }>("SELECT count(*)::text AS n FROM password_resets");
    expect(Number(count[0].n)).toBe(0);
  });

  it("invalidates the previous code when a new one is requested", async () => {
    await issueAndReadCode();
    const first = await row();

    await issueAndReadCode();

    const used = await sql.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM password_resets WHERE used_at IS NOT NULL",
    );
    expect(Number(used[0].n)).toBe(1);
    expect(first.token_hash).toBeTruthy();
  });

  it("sets an expiry in the future", async () => {
    await issueAndReadCode();
    const r = await row();
    expect(Date.parse(r.expires_at)).toBeGreaterThan(Date.now());
  });
});

describe("resetPasswordWithCode", () => {
  it("sets the password and revokes other sessions on a valid code", async () => {
    const code = await issueAndReadCode();
    const record: Record<string, unknown> = {};

    const result = await pr.resetPasswordWithCode(USER.phone, code, "new-password-1234", deps(record));

    expect(result).toEqual({ ok: true });
    expect(record.userId).toBe(USER.id);
    expect(record.password).toBe("new-password-1234");
    expect(record.revoked).toBe(true);
  });

  it("consumes the code so it cannot be reused", async () => {
    const code = await issueAndReadCode();
    const first = await pr.resetPasswordWithCode(USER.phone, code, "new-password-1234", deps({}));
    expect(first.ok).toBe(true);

    const second = await pr.resetPasswordWithCode(USER.phone, code, "another-password-99", deps({}));
    expect(second).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses a wrong code", async () => {
    await issueAndReadCode();
    const result = await pr.resetPasswordWithCode(USER.phone, "00000000", "new-password-1234", deps({}));
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses an unknown phone", async () => {
    const result = await pr.resetPasswordWithCode("09129999999", "12345678", "new-password-1234", deps({}));
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses a malformed or wrong-length code", async () => {
    for (const bad of ["", "123", "abcdefgh", "1234567"]) {
      const result = await pr.resetPasswordWithCode(USER.phone, bad, "new-password-1234", deps({}));
      expect(result.ok).toBe(false);
    }
  });

  it("refuses an expired code", async () => {
    const code = await issueAndReadCode();
    await sql.execute("UPDATE password_resets SET expires_at = now() - interval '1 minute'");

    const result = await pr.resetPasswordWithCode(USER.phone, code, "new-password-1234", deps({}));
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("caps wrong guesses at the attempt budget", async () => {
    const code = await issueAndReadCode();
    const setPassword = vi.fn();

    // Five wrong guesses spend the budget.
    for (let i = 0; i < 5; i++) {
      const r = await pr.resetPasswordWithCode(USER.phone, "0000000" + i, "new-password-1234", {
        resolveUser,
        setPassword: async () => {},
        revokeOtherSessions: async () => {},
      });
      expect(r.ok).toBe(false);
    }

    const exhausted = await pr.resetPasswordWithCode(USER.phone, "00000009", "new-password-1234", {
      resolveUser,
      setPassword: async () => {},
      revokeOtherSessions: async () => {},
    });
    expect(exhausted).toEqual({ ok: false, reason: "attempts" });

    // Even the correct code is refused once the budget is gone.
    const withRealCode = await pr.resetPasswordWithCode(USER.phone, code, "new-password-1234", {
      resolveUser,
      setPassword,
      revokeOtherSessions: async () => {},
    });
    expect(withRealCode).toEqual({ ok: false, reason: "attempts" });
    expect(setPassword).not.toHaveBeenCalled();
  });

  it("resets the attempt budget when a fresh code is requested", async () => {
    await issueAndReadCode();
    for (let i = 0; i < 5; i++) {
      await pr.resetPasswordWithCode(USER.phone, "0000000" + i, "new-password-1234", {
        resolveUser,
        setPassword: async () => {},
        revokeOtherSessions: async () => {},
      });
    }

    // A new code starts a clean budget.
    const code = await issueAndReadCode();
    const result = await pr.resetPasswordWithCode(USER.phone, code, "new-password-1234", deps({}));
    expect(result).toEqual({ ok: true });
  });

  it("lets only one of two concurrent submissions win", async () => {
    const code = await issueAndReadCode();
    const calls: string[] = [];

    const makeDeps = (tag: string) => ({
      resolveUser,
      setPassword: async () => {
        calls.push(tag);
      },
      revokeOtherSessions: async () => {},
    });

    const results = await Promise.all([
      pr.resetPasswordWithCode(USER.phone, code, "new-password-1234", makeDeps("a")),
      pr.resetPasswordWithCode(USER.phone, code, "new-password-1234", makeDeps("b")),
    ]);

    const wins = results.filter((r) => r.ok);
    expect(wins).toHaveLength(1);
    expect(calls).toHaveLength(1);
  });

  /**
   * The test above can pass even with the consumption guard removed, because the
   * pool may serialise the two calls so the second never sees an unused row.
   * This one exercises the guard itself: two genuinely parallel UPDATEs against
   * the same row must produce exactly one winner. That is the statement the
   * single-use guarantee rests on.
   */
  it("consumption is atomic — two parallel UPDATEs yield exactly one row", async () => {
    // The plaintext code is irrelevant here; only the row identity matters.
    await issueAndReadCode();
    const r = await row();
    const id = (
      await sql.query<{ id: string }>("SELECT id FROM password_resets WHERE token_hash = $1", [r.token_hash])
    )[0].id;

    const results = await Promise.all([
      sql.query<{ id: string }>(
        "UPDATE password_resets SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id",
        [id],
      ),
      sql.query<{ id: string }>(
        "UPDATE password_resets SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id",
        [id],
      ),
    ]);

    const winners = results.filter((rows) => rows.length > 0);
    expect(winners).toHaveLength(1);
  });

  it("a consumed code is invisible to a later lookup", async () => {
    const code = await issueAndReadCode();
    await pr.resetPasswordWithCode(USER.phone, code, "new-password-1234", deps({}));

    const visible = await sql.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM password_resets WHERE used_at IS NULL",
    );
    expect(Number(visible[0].n)).toBe(0);
  });
});
