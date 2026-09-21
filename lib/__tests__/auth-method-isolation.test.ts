import { describe, expect, it } from "vitest";
import { validAuthIntent } from "@/lib/auth-intent";

describe("authentication method isolation", () => {
  it("accepts an explicit password flow without an OTP code", () => {
    expect(validAuthIntent({ method: "password", code: null }, "password")).toBe(true);
  });

  it("accepts an explicit OTP flow without a password", () => {
    expect(validAuthIntent({ method: "otp", password: null }, "otp")).toBe(true);
  });

  it("rejects a missing or switched method", () => {
    expect(validAuthIntent({ method: null }, "password")).toBe(false);
    expect(validAuthIntent({ method: "otp" }, "password")).toBe(false);
    expect(validAuthIntent({ method: "password" }, "otp")).toBe(false);
  });

  it("rejects mixed credentials in either direction", () => {
    expect(validAuthIntent({ method: "password", code: "123456" }, "password")).toBe(false);
    expect(validAuthIntent({ method: "otp", password: "secret" }, "otp")).toBe(false);
  });
});
