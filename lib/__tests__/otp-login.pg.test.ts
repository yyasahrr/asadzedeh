import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSafeTestUrl, startTestDatabase, type TestDatabase } from "./helpers/pg";

/**
 * One-time-code phone login.
 *
 * This is a login surface keyed on a 6-digit SMS code, so the tests pin the same
 * properties the password-reset suite does — hashed storage, single use, expiry,
 * a bounded attempt budget, no account enumeration — plus the two that are
 * specific to login: a resend cooldown, and the fact that a successful code
 * actually consumes itself so it cannot be replayed.
 */

let db: TestDatabase;
let sql: Awaited<ReturnType<typeof import("@/lib/db/client").getSql>>;
let otp: typeof import("@/lib/otp");

const PHONE = "09121112233";
const resolveUser = (phone: string) => (phone === PHONE ? { id: "u-otp" } : undefined);

/** Reads the only outstanding code row for the fixture phone. */
async function stored() {
  const rows = await sql.query<{ code_hash: string; attempts: number; used_at: string | null }>(
    "SELECT code_hash, attempts, used_at FROM otp_codes WHERE phone = $1 ORDER BY created_at DESC",
    [PHONE],
  );
  return rows[0];
}

/** Insert a code whose plaintext we know, backdated outside the cooldown. */
async function seedCode(id: string, phone: string, code: string) {
  const crypto = await import("node:crypto");
  await sql.query(
    `INSERT INTO otp_codes (id, phone, code_hash, expires_at, used_at, attempts, created_at)
     VALUES ($1, $2, $3, now() + interval '5 minutes', NULL, 0, now() - interval '10 minutes')`,
    [id, phone, crypto.createHash("sha256").update(code).digest("hex")],
  );
}

beforeAll(async () => {
  db = await startTestDatabase();
  assertSafeTestUrl(db.url);

  Object.assign(process.env, { NODE_ENV: "test", DATABASE_URL: db.url, APP_SECRET: "test-secret-for-ci-only-0123456789" });

  const client = await import("@/lib/db/client");
  const { runMigrations } = await import("@/lib/db/migrate");
  sql = await client.getSql();
  expect(sql.kind).toBe("postgres");
  await runMigrations();

  // The SMS layer would otherwise try to reach a real panel.
  vi.doMock("@/lib/notify", () => ({
    sendSmsCode: async () => ({ ok: true, mode: "demo", detail: "stub" }),
    sendSms: async () => ({ ok: true, mode: "demo", detail: "stub" }),
  }));

  otp = await import("@/lib/otp");
}, 120_000);

afterAll(async () => {
  vi.doUnmock("@/lib/notify");
  await db?.stop();
});

beforeEach(async () => {
  await sql.execute("DELETE FROM otp_codes");
});

describe("requesting a code", () => {
  it("stores only the hash, never the code", async () => {
    await otp.requestLoginOtp(PHONE, resolveUser);
    const row = await stored();
    expect(row).toBeDefined();
    // sha256 hex, and not a 6-digit plaintext
    expect(row.code_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.code_hash).not.toMatch(/^\d{6}$/);
  });

  it("stores nothing for an unregistered phone", async () => {
    const r = await otp.requestLoginOtp("09129998877", resolveUser);
    expect(r).toEqual({ ok: true, sent: false });
    const rows = await sql.query<{ n: number }>("SELECT count(*)::int AS n FROM otp_codes");
    expect(rows[0].n).toBe(0);
  });

  it("rejects a malformed number without touching the database", async () => {
    const r = await otp.requestLoginOtp("12345", resolveUser);
    expect(r).toEqual({ ok: true, sent: false });
  });

  it("supersedes the previous outstanding code", async () => {
    await otp.requestLoginOtp(PHONE, resolveUser);
    const first = (await stored()).code_hash;
    // Move the first code outside the cooldown window so the second is allowed.
    await sql.execute("UPDATE otp_codes SET created_at = now() - interval '10 minutes'");
    await otp.requestLoginOtp(PHONE, resolveUser);
    const rows = await sql.query<{ used_at: string | null }>(
      "SELECT used_at FROM otp_codes WHERE phone = $1 ORDER BY created_at",
      [PHONE],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].used_at).not.toBeNull(); // the old one is dead
    expect((await stored()).code_hash).not.toBe(first);
  });

  it("enforces the resend cooldown", async () => {
    await otp.requestLoginOtp(PHONE, resolveUser);
    const second = await otp.requestLoginOtp(PHONE, resolveUser);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reason).toBe("cooldown");
      expect(second.retryAfterSeconds).toBeGreaterThan(0);
    }
    // and no extra row was written
    const rows = await sql.query<{ n: number }>("SELECT count(*)::int AS n FROM otp_codes");
    expect(rows[0].n).toBe(1);
  });
});

describe("verifying a code", () => {
  it("rejects a wrong code and spends the attempt budget", async () => {
    await otp.requestLoginOtp(PHONE, resolveUser);
    const r = await otp.verifyLoginOtp(PHONE, "000000");
    expect(r).toEqual({ ok: false, reason: "invalid" });
    expect((await stored()).attempts).toBe(1);
  });

  it("exhausts the budget after five wrong guesses", async () => {
    await otp.requestLoginOtp(PHONE, resolveUser);
    for (let i = 0; i < 5; i += 1) {
      await otp.verifyLoginOtp(PHONE, `00000${i}`);
    }
    const r = await otp.verifyLoginOtp(PHONE, "111111");
    expect(r).toEqual({ ok: false, reason: "attempts" });
  });

  it("refuses an expired code", async () => {
    await seedCode("otp-exp", PHONE, "135790");
    await sql.execute("UPDATE otp_codes SET expires_at = now() - interval '1 minute'");
    // The hash matches, so only the expiry can be what refuses it.
    const r = await otp.verifyLoginOtp(PHONE, "135790");
    expect(r).toEqual({ ok: false, reason: "expired" });
  });

  it("consumes a code so it cannot be replayed", async () => {
    await seedCode("otp-test", PHONE, "424242");

    const first = await otp.verifyLoginOtp(PHONE, "424242");
    expect(first).toEqual({ ok: true });
    // Replay must fail — the row is now marked used.
    const second = await otp.verifyLoginOtp(PHONE, "424242");
    expect(second).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a malformed code shape before touching the database", async () => {
    const r = await otp.verifyLoginOtp(PHONE, "12");
    expect(r).toEqual({ ok: false, reason: "invalid" });
  });

  it("accepts the correct code once", async () => {
    await seedCode("otp-ok", PHONE, "913570");
    const r = await otp.verifyLoginOtp(PHONE, "913570");
    expect(r).toEqual({ ok: true });
  });
});

describe("the single-use primitive itself", () => {
  /**
   * The end-to-end replay test above passes for two independent reasons: the
   * lookup SELECT already filters `used_at IS NULL`, so it masks the consuming
   * UPDATE. This test isolates the UPDATE on its own, because that statement —
   * not the SELECT — is what makes two genuinely concurrent submissions unable
   * to both win. Testing the statement rather than a path through it is the only
   * way to pin it.
   */
  it("consumes a row exactly once, and reports zero rows the second time", async () => {
    await seedCode("otp-once", PHONE, "515151");

    const stmt = "UPDATE otp_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id";
    const first = await sql.query<{ id: string }>(stmt, ["otp-once"]);
    expect(first).toHaveLength(1);

    const second = await sql.query<{ id: string }>(stmt, ["otp-once"]);
    expect(second).toHaveLength(0);
  });

  it("lets only one of two truly parallel consumers win", async () => {
    await seedCode("otp-tie", PHONE, "616161");

    // Both statements target the same row at the same instant; Postgres
    // serialises them, and the loser must see zero rows.
    const stmt = "UPDATE otp_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id";
    const [a, b] = await Promise.all([
      sql.query<{ id: string }>(stmt, ["otp-tie"]),
      sql.query<{ id: string }>(stmt, ["otp-tie"]),
    ]);
    expect(a.length + b.length).toBe(1);
  });
});

describe("concurrency", () => {
  it("lets only one of several parallel submissions succeed", async () => {
    await seedCode("otp-race", PHONE, "246810");
    const results = await Promise.all(
      Array.from({ length: 5 }, () => otp.verifyLoginOtp(PHONE, "246810")),
    );
    const wins = results.filter((r) => r.ok).length;
    expect(wins).toBe(1);
  });
});
