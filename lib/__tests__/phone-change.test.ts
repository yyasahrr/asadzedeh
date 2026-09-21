import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { call, loginAs, runtime } from "./helpers/next-runtime";

const otp = vi.hoisted(() => ({ requestLoginOtp: vi.fn(), verifyLoginOtp: vi.fn() }));
vi.mock("@/lib/otp", () => otp);

let actions: typeof import("@/app/account/security/actions");
let auth: typeof import("@/lib/auth");
let phoneChange: typeof import("@/lib/phone-change");
let store: typeof import("@/lib/store");
let serial = 0;
let ownerId = "";
let oldPhone = "";
let newPhone = "";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeAll(async () => {
  Object.assign(process.env, { NODE_ENV: "test", PGLITE_DIR: "memory", APP_SECRET: "phone-change-test-secret-0123456789" });
  store = await import("@/lib/store");
  auth = await import("@/lib/auth");
  phoneChange = await import("@/lib/phone-change");
  await store.initStore();
  actions = await import("@/app/account/security/actions");
});

beforeEach(async () => {
  serial += 1;
  ownerId = `phone-owner-${serial}`;
  oldPhone = `0912${String(1000000 + serial).slice(-7)}`;
  newPhone = `0935${String(2000000 + serial).slice(-7)}`;
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 60 * 60_000).toISOString();
  runtime().cookies.clear();
  otp.requestLoginOtp.mockReset().mockResolvedValue({ ok: true, sent: true });
  otp.verifyLoginOtp.mockReset().mockResolvedValue({ ok: true });
  const owner = {
    id: ownerId, name: "مالک تست", phone: oldPhone, role: "super_admin" as const, createdAt: now,
    passwordHash: auth.hashPassword("current-password"),
    totp: { enabled: true as const, secret: "totp-secret-must-stay", recoveryCodes: ["recovery-hash"], enabledAt: now },
  };
  store.writeDb({
    users: [...store.getUsers(), owner],
    sessions: [...store.getSessions(),
      { token: `tok-${ownerId}`, userId: ownerId, createdAt: now, lastSeen: now, expiresAt: later, mfaVerified: true },
      { token: `other-${ownerId}`, userId: ownerId, createdAt: now, lastSeen: now, expiresAt: later, mfaVerified: true },
    ],
  });
  await store.flushStore();
  loginAs(ownerId);
});

describe("owner phone change", () => {
  it("normalizes the destination and sends OTP only to the new phone without updating early", async () => {
    const outcome = await call(() => actions.requestPhoneChange(form({ currentPassword: "current-password", newPhone: `+98${newPhone.slice(1)}` })));
    expect(outcome.redirected).toBe("/account/security?phoneStep=verify");
    expect(otp.requestLoginOtp).toHaveBeenCalledWith(newPhone, expect.any(Function));
    expect(store.getUserById(ownerId)?.phone).toBe(oldPhone);
    expect(runtime().cookies.has(phoneChange.PHONE_CHANGE_COOKIE)).toBe(true);
  });

  it.each([
    ["wrong password", { currentPassword: "wrong", newPhone: "09351112233" }, "password"],
    ["malformed phone", { currentPassword: "current-password", newPhone: "123" }, "format"],
  ])("rejects %s before sending", async (_label, values, error) => {
    const outcome = await call(() => actions.requestPhoneChange(form(values)));
    expect(outcome.redirected).toBe(`/account/security?phoneError=${error}`);
    expect(otp.requestLoginOtp).not.toHaveBeenCalled();
    expect(store.getUserById(ownerId)?.phone).toBe(oldPhone);
  });

  it("rejects the current phone before sending", async () => {
    const outcome = await call(() => actions.requestPhoneChange(form({ currentPassword: "current-password", newPhone: oldPhone })));
    expect(outcome.redirected).toBe("/account/security?phoneError=same");
    expect(otp.requestLoginOtp).not.toHaveBeenCalled();
  });

  it("rejects a phone already owned by another account", async () => {
    store.writeDb({ users: [...store.getUsers(), { id: `duplicate-${serial}`, name: "دیگری", phone: newPhone, role: "student", passwordHash: "x", createdAt: "today" }] });
    const outcome = await call(() => actions.requestPhoneChange(form({ currentPassword: "current-password", newPhone })));
    expect(outcome.redirected).toBe("/account/security?phoneError=duplicate");
    expect(otp.requestLoginOtp).not.toHaveBeenCalled();
  });

  it("binds verification to the authenticated owner and exact new phone", async () => {
    runtime().cookies.set(phoneChange.PHONE_CHANGE_COOKIE, phoneChange.createPhoneChangeChallenge("someone-else", oldPhone, newPhone));
    const outcome = await call(() => actions.verifyPhoneChange(form({ code: "123456" })));
    expect(outcome.redirected).toBe("/account/security?phoneError=challenge");
    expect(otp.verifyLoginOtp).not.toHaveBeenCalled();
  });

  it("rejects an expired challenge", async () => {
    runtime().cookies.set(phoneChange.PHONE_CHANGE_COOKIE, phoneChange.createPhoneChangeChallenge(ownerId, oldPhone, newPhone, Date.now() - 6 * 60_000));
    const outcome = await call(() => actions.verifyPhoneChange(form({ code: "123456" })));
    expect(outcome.redirected).toBe("/account/security?phoneError=expired");
    expect(store.getUserById(ownerId)?.phone).toBe(oldPhone);
  });

  it("does not update on a wrong OTP", async () => {
    otp.verifyLoginOtp.mockResolvedValue({ ok: false, reason: "invalid" });
    runtime().cookies.set(phoneChange.PHONE_CHANGE_COOKIE, phoneChange.createPhoneChangeChallenge(ownerId, oldPhone, newPhone));
    const outcome = await call(() => actions.verifyPhoneChange(form({ code: "000000" })));
    expect(outcome.redirected).toBe("/account/security?phoneError=invalid");
    expect(otp.verifyLoginOtp).toHaveBeenCalledWith(newPhone, "000000");
    expect(store.getUserById(ownerId)?.phone).toBe(oldPhone);
  });

  it("atomically changes only the login phone, preserves TOTP/current session, revokes others, and consumes the challenge", async () => {
    runtime().cookies.set(phoneChange.PHONE_CHANGE_COOKIE, phoneChange.createPhoneChangeChallenge(ownerId, oldPhone, newPhone));
    const outcome = await call(() => actions.verifyPhoneChange(form({ code: "123456" })));
    expect(outcome.redirected).toBe("/account/security?saved=phone");
    expect(store.getUserById(ownerId)).toMatchObject({ phone: newPhone, totp: { secret: "totp-secret-must-stay" } });
    expect(store.getSessions().filter((session) => session.userId === ownerId).map((session) => session.token)).toEqual([`tok-${ownerId}`]);
    expect((await auth.getSessionUser())?.phone).toBe(newPhone);
    expect(runtime().cookies.has(phoneChange.PHONE_CHANGE_COOKIE)).toBe(false);
    const audit = store.getAudit().find((entry) => entry.action === "auth.phone.changed");
    expect(audit?.detail).toMatchObject({ oldPhone: phoneChange.maskPhone(oldPhone), newPhone: phoneChange.maskPhone(newPhone), otherSessionsRevoked: true });
    expect(JSON.stringify(audit)).not.toContain(oldPhone);
    expect(JSON.stringify(audit)).not.toContain(newPhone);
    expect(JSON.stringify(audit)).not.toContain("current-password");
    expect(JSON.stringify(audit)).not.toContain("123456");

    const replay = await call(() => actions.verifyPhoneChange(form({ code: "123456" })));
    expect(replay.redirected).toBe("/account/security?phoneError=challenge");
  });

  it("rejects a stale challenge after the account phone changes", async () => {
    runtime().cookies.set(phoneChange.PHONE_CHANGE_COOKIE, phoneChange.createPhoneChangeChallenge(ownerId, oldPhone, newPhone));
    store.writeDb({ users: store.getUsers().map((user) => user.id === ownerId ? { ...user, phone: "09129999999" } : user) });
    const outcome = await call(() => actions.verifyPhoneChange(form({ code: "123456" })));
    expect(outcome.redirected).toBe("/account/security?phoneError=stale");
    expect(otp.verifyLoginOtp).not.toHaveBeenCalled();
  });

  it("denies a disabled account", async () => {
    store.writeDb({ users: store.getUsers().map((user) => user.id === ownerId ? { ...user, disabled: true } : user) });
    const outcome = await call(() => actions.requestPhoneChange(form({ currentPassword: "current-password", newPhone })));
    expect(outcome.redirected).toBe("/auth?next=/account/security");
    expect(otp.requestLoginOtp).not.toHaveBeenCalled();
  });
});
