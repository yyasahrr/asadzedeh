import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSafeTestUrl, startTestDatabase, type TestDatabase } from "./helpers/pg";

/**
 * SMS one-time login codes.
 *
 * An OTP that logs someone in is a stronger capability than a reset code, so
 * these tests pin the same guarantees plus the send budget: the code is stored
 * hashed, it is single-use, it expires, wrong guesses are bounded, and an
 * unregistered number cannot be distinguished from a registered one.
 */

let db: TestDatabase;
let sql: Awaited<ReturnType<typeof import("@/lib/db/client").getSql>>;
let otp: typeof import("@/lib/otp");
let store: typeof import("@/lib/store");

const PHONE = "09121112244";

beforeAll(async () => {
  db = await startTestDatabase();
  assertSafeTestUrl(db.url);

  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: db.url,
    APP_SECRET: "test-secret-for-ci-only-0123456789",
  });

  const client = await import("@/lib/db/client");
  const { runMigrations } = await import("@/lib/db/migrate");
  sql = await client.getSql();
  expect(sql.kind).toBe("postgres");
  await runMigrations();

  store = await import("@/lib/store");
  await store.initStore();
  otp = await import("@/lib/otp");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

beforeEach(async () => {
  await sql.execute("DELETE FROM otp_codes");
  const settings = store.getSettings();
  store.writeDb({
    settings: {
      ...settings,
      sms: { ...settings.sms, provider: "demo", apiKey: "" },
      otp: { enabled: true, allowRegistration: true, codeLength: 6, ttlMinutes: 3, maxPerHour: 6 },
    },
  });
});

const row = async () =>
  (
    await sql.query<{ code_hash: string; used_at: string | null; attempts: string }>(
      "SELECT code_hash, used_at, attempts::text AS attempts FROM otp_codes ORDER BY created_at DESC LIMIT 1",
    )
  )[0];

/** Issue a code and recover the plaintext from the (demo) SMS payload. */
async function issueAndReadCode(phone = PHONE, known = true): Promise<string> {
  const sms = vi.spyOn(await import("@/lib/notify"), "sendSms");
  const result = await otp.requestOtp(phone, known);
  expect(result.ok).toBe(true);
  const message = sms.mock.calls.at(-1)?.[1] ?? "";
  sms.mockRestore();
  return (message.match(/\d{6}/) ?? [""])[0];
}

describe("requestOtp", () => {
  it("stores only a hash of the code", async () => {
    const code = await issueAndReadCode();
    expect(code).toMatch(/^\d{6}$/);

    const r = await row();
    expect(r.code_hash).not.toBe(code);
    expect(r.code_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(r.used_at).toBeNull();
  });

  it("is indistinguishable for an unregistered number when registration is off", async () => {
    const settings = store.getSettings();
    store.writeDb({ settings: { ...settings, otp: { ...settings.otp, allowRegistration: false } } });

    const result = await otp.requestOtp("09129999999", false);
    expect(result).toMatchObject({ ok: true, sent: false });
    // Nothing was stored, so nothing can be guessed against.
    const rows = await sql.query("SELECT id FROM otp_codes");
    expect(rows).toHaveLength(0);
  });

  it("rejects a malformed phone number", async () => {
    const result = await otp.requestOtp("12345", true);
    expect(result).toMatchObject({ ok: false, reason: "invalid_phone" });
  });

  it("caps the number of codes per phone per hour", async () => {
    const settings = store.getSettings();
    store.writeDb({ settings: { ...settings, otp: { ...settings.otp, maxPerHour: 2 } } });

    expect((await otp.requestOtp(PHONE, true)).ok).toBe(true);
    expect((await otp.requestOtp(PHONE, true)).ok).toBe(true);
    expect(await otp.requestOtp(PHONE, true)).toMatchObject({ ok: false, reason: "rate_limited" });
  });

  it("supersedes an outstanding code", async () => {
    const first = await issueAndReadCode();
    await issueAndReadCode();

    // The earlier code must no longer work.
    expect(await otp.verifyOtp(PHONE, first)).toMatchObject({ ok: false });
  });

  it("refuses to issue when the feature is disabled", async () => {
    const settings = store.getSettings();
    store.writeDb({ settings: { ...settings, otp: { ...settings.otp, enabled: false } } });
    expect(await otp.requestOtp(PHONE, true)).toMatchObject({ ok: false, reason: "disabled" });
  });
});

describe("verifyOtp", () => {
  it("accepts the code once and only once", async () => {
    const code = await issueAndReadCode();

    expect(await otp.verifyOtp(PHONE, code)).toMatchObject({ ok: true, phone: PHONE });
    // Replay must fail — the row was consumed atomically.
    expect(await otp.verifyOtp(PHONE, code)).toMatchObject({ ok: false });
  });

  it("normalises the submitted phone number", async () => {
    const code = await issueAndReadCode();
    expect(await otp.verifyOtp("+98" + PHONE.slice(1), code)).toMatchObject({ ok: true });
  });

  it("rejects an expired code", async () => {
    const code = await issueAndReadCode();
    await sql.execute("UPDATE otp_codes SET expires_at = now() - interval '1 minute'");
    expect(await otp.verifyOtp(PHONE, code)).toMatchObject({ ok: false, reason: "expired" });
  });

  it("spends the attempt budget on wrong guesses and then locks the code out", async () => {
    const code = await issueAndReadCode();
    const wrong = code === "000000" ? "111111" : "000000";

    for (let i = 0; i < 5; i += 1) await otp.verifyOtp(PHONE, wrong);

    expect(Number((await row()).attempts)).toBeGreaterThanOrEqual(5);
    // Even the correct code is refused once the budget is gone.
    expect(await otp.verifyOtp(PHONE, code)).toMatchObject({ ok: false, reason: "attempts" });
  });

  it("rejects a code of the wrong length without touching the database", async () => {
    await issueAndReadCode();
    expect(await otp.verifyOtp(PHONE, "123")).toMatchObject({ ok: false, reason: "invalid" });
    expect(Number((await row()).attempts)).toBe(0);
  });
});
