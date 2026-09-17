import { beforeAll, describe, expect, it } from "vitest";

let challenge: typeof import("../otp-challenge");

beforeAll(async () => {
  process.env.APP_SECRET = "otp-challenge-test-secret-0123456789";
  challenge = await import("../otp-challenge");
});

describe("signed OTP challenge", () => {
  it("preserves the phone, server-driven timers, and a safe next path", () => {
    const now = 1_800_000_000_000;
    const token = challenge.createOtpChallenge("۰۹۱۲۳۴۵۶۷۸۹", "/checkout", now);
    const parsed = challenge.readOtpChallenge(token);
    expect(parsed).toMatchObject({
      phone: "09123456789",
      next: "/checkout",
      otpExpiresAt: now + 300_000,
      resendAvailableAt: now + 90_000,
    });
  });

  it("rejects tampering and strips malicious next values", () => {
    const token = challenge.createOtpChallenge("09123456789", "https://evil.example", Date.now());
    expect(challenge.readOtpChallenge(token)?.next).toBe("");
    expect(challenge.readOtpChallenge(`${token}x`)).toBeNull();
  });

  it("masks a valid phone without exposing it in display text", () => {
    expect(challenge.maskIranianPhone("09123456789")).toBe("0912***6789");
  });
});
