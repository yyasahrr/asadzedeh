import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/auth";

describe("auth", () => {
  describe("hashPassword / verifyPassword", () => {
    it("hashes a password and verifies it correctly", () => {
      const password = "mysecretpassword123";
      const hash = hashPassword(password);
      expect(verifyPassword(password, hash)).toBe(true);
    });

    it("rejects wrong password", () => {
      const hash = hashPassword("correctpassword");
      expect(verifyPassword("wrongpassword", hash)).toBe(false);
    });

    it("produces unique hashes for same password (different salts)", () => {
      const h1 = hashPassword("samepassword");
      const h2 = hashPassword("samepassword");
      expect(h1).not.toBe(h2);
      expect(verifyPassword("samepassword", h1)).toBe(true);
      expect(verifyPassword("samepassword", h2)).toBe(true);
    });

    it("handles empty string gracefully", () => {
      const hash = hashPassword("");
      expect(verifyPassword("", hash)).toBe(true);
      expect(verifyPassword("a", hash)).toBe(false);
    });
  });

  describe("crypto.randomBytes for secure generation", () => {
    it("generates cryptographically secure random bytes", () => {
      const bytes1 = crypto.randomBytes(16).toString("hex");
      const bytes2 = crypto.randomBytes(16).toString("hex");
      expect(bytes1).toHaveLength(32);
      expect(bytes2).toHaveLength(32);
      expect(bytes1).not.toBe(bytes2);
    });

    it("generates secure base64url tokens", () => {
      const token = crypto.randomBytes(12).toString("base64url").slice(0, 12);
      expect(token).toHaveLength(12);
      expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    });
  });
});
