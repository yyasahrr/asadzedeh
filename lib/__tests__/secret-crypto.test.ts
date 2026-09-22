import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";

const originalSecret = process.env.APP_SECRET;
afterEach(() => {
  if (originalSecret === undefined) delete process.env.APP_SECRET;
  else process.env.APP_SECRET = originalSecret;
});

describe("SMS credential encryption", () => {
  it("uses versioned authenticated ciphertext and a fresh nonce", () => {
    process.env.APP_SECRET = "test-only-secret-that-never-leaves-this-process";
    const first = encryptSecret("panel-password");
    const second = encryptSecret("panel-password");
    expect(first).toMatch(/^enc:v1:/);
    expect(second).toMatch(/^enc:v1:/);
    expect(first).not.toBe(second);
    expect(decryptSecret(first)).toBe("panel-password");
  });

  it("rejects corrupted ciphertext and ciphertext encrypted with an old APP_SECRET", () => {
    process.env.APP_SECRET = "old-test-secret";
    const encrypted = encryptSecret("panel-password");
    expect(() => decryptSecret(`${encrypted.slice(0, -1)}A`)).toThrow();
    process.env.APP_SECRET = "rotated-test-secret";
    expect(() => decryptSecret(encrypted)).toThrow();
  });

  it("reads legacy plaintext for migration-on-write compatibility", () => {
    expect(decryptSecret("legacy-plaintext")).toBe("legacy-plaintext");
  });
});
