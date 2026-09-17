import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("OTP verification UI", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components/auth/OtpChallengeForm.tsx"), "utf8");
  const tabs = fs.readFileSync(path.join(process.cwd(), "components/auth/AuthTabs.tsx"), "utf8");

  it("has six accessible numeric boxes and no editable second phone field", () => {
    expect(source).toContain("grid-cols-6");
    expect(source).toContain('autoComplete={index === 0 ? "one-time-code"');
    expect(source).toContain('inputMode="numeric"');
    expect(tabs).not.toContain("otp-phone2");
  });

  it("provides resend and change-phone recovery actions", () => {
    expect(source).toContain("resendOtpAction");
    expect(source).toContain("changeOtpPhoneAction");
    expect(source).toContain("disabled={resend > 0}");
  });
});
