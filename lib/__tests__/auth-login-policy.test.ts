import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { call, runtime } from "./helpers/next-runtime";

const otpMocks = vi.hoisted(() => ({
  requestLoginOtp: vi.fn(),
  verifyLoginOtp: vi.fn(),
}));

vi.mock("@/lib/otp", () => otpMocks);

let actions: typeof import("@/app/auth/actions");
let store: typeof import("@/lib/store");
let auth: typeof import("@/lib/auth");
let challenge: typeof import("@/lib/otp-challenge");

const phone = "09128889977";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

beforeAll(async () => {
  Object.assign(process.env, { NODE_ENV: "test", PGLITE_DIR: "memory", APP_SECRET: "auth-policy-test-secret-0123456789" });
  store = await import("@/lib/store");
  auth = await import("@/lib/auth");
  challenge = await import("@/lib/otp-challenge");
  actions = await import("@/app/auth/actions");
});

beforeEach(() => {
  runtime().cookies.clear();
  otpMocks.requestLoginOtp.mockReset();
  otpMocks.verifyLoginOtp.mockReset();
  const existing = store.getUsers().filter((user) => user.phone !== phone);
  store.writeDb({
    users: [{
      id: "u-auth-policy", name: "کاربر تست", phone,
      passwordHash: auth.hashPassword("correct-password"), role: "super_admin",
      createdAt: "امروز", totp: { enabled: true, secret: "preserved", recoveryCodes: ["hash"], enabledAt: new Date().toISOString() },
    }, ...existing],
    sessions: [],
  });
});

describe("independent login methods", () => {
  it("password login creates a session and redirects directly without OTP/TOTP", async () => {
    const result = await call(() => actions.login(form({ method: "password", phone, password: "correct-password", next: "/admin" })));
    expect(result.redirected).toBe("/admin");
    expect(runtime().cookies.has(auth.SESSION_COOKIE)).toBe(true);
    expect(otpMocks.requestLoginOtp).not.toHaveBeenCalled();
    expect(store.getUserByPhone(phone)?.totp?.secret).toBe("preserved");
  });

  it("invalid password fails in password mode without sending OTP", async () => {
    const result = await call(() => actions.login(form({ method: "password", phone, password: "wrong" })));
    expect(result.redirected).toContain("tab=login&error=invalid");
    expect(otpMocks.requestLoginOtp).not.toHaveBeenCalled();
  });

  it("rejects mixed password state before authenticating", async () => {
    const result = await call(() => actions.login(form({ method: "password", phone, password: "correct-password", code: "123456" })));
    expect(result.redirected).toContain("error=method");
    expect(runtime().cookies.has(auth.SESSION_COOKIE)).toBe(false);
  });

  it("OTP login creates a session without a password and accepts super_admin", async () => {
    otpMocks.verifyLoginOtp.mockResolvedValue({ ok: true });
    runtime().cookies.set(challenge.OTP_CHALLENGE_COOKIE, challenge.createOtpChallenge(phone, "/admin"));
    const result = await call(() => actions.verifyOtpAction(form({ method: "otp", code: "123456" })));
    expect(result.redirected).toBe("/admin");
    expect(runtime().cookies.has(auth.SESSION_COOKIE)).toBe(true);
    expect(store.getUserByPhone(phone)?.totp?.secret).toBe("preserved");
  });

  it("invalid OTP never falls back to password", async () => {
    otpMocks.verifyLoginOtp.mockResolvedValue({ ok: false, reason: "invalid" });
    runtime().cookies.set(challenge.OTP_CHALLENGE_COOKIE, challenge.createOtpChallenge(phone, "/dashboard"));
    const result = await call(() => actions.verifyOtpAction(form({ method: "otp", code: "000000" })));
    expect(result.redirected).toContain("tab=otp&error=invalid");
    expect(runtime().cookies.has(auth.SESSION_COOKIE)).toBe(false);
  });

  it("denies a disabled account in both modes", async () => {
    store.writeDb({ users: store.getUsers().map((user) => user.phone === phone ? { ...user, disabled: true } : user) });
    const passwordResult = await call(() => actions.login(form({ method: "password", phone, password: "correct-password" })));
    expect(passwordResult.redirected).toContain("tab=login&error=invalid");

    otpMocks.verifyLoginOtp.mockResolvedValue({ ok: true });
    runtime().cookies.set(challenge.OTP_CHALLENGE_COOKIE, challenge.createOtpChallenge(phone, "/admin"));
    const otpResult = await call(() => actions.verifyOtpAction(form({ method: "otp", code: "123456" })));
    expect(otpResult.redirected).toContain("tab=otp&error=locked");
    expect(runtime().cookies.has(auth.SESSION_COOKIE)).toBe(false);
  });

  it("rejects an unsafe external next destination", async () => {
    const result = await call(() => actions.login(form({ method: "password", phone, password: "correct-password", next: "https://evil.example" })));
    expect(result.redirected).toBe("/auth?tab=login&error=validation");
  });
});
