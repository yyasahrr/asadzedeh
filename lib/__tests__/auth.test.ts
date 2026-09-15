import { describe, it, expect, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { SEED_ACCOUNTS, SEED_DEMO_ACCOUNT_IDS } from "@/lib/seed";

const APP_SECRET = "test-secret-for-ci-only-0123456789";

/**
 * `getEnv()` memoises on first call, so every policy case resets the module
 * registry and re-imports `@/lib/auth`. Mutating NODE_ENV in place would not be
 * observed — the same reason `staff-mfa-policy.test.ts` does this.
 */
async function loadAuth(nodeEnv: string) {
  Object.assign(process.env, { NODE_ENV: nodeEnv, APP_SECRET, PGLITE_DIR: "memory" });
  vi.resetModules();
  return import("@/lib/auth");
}

afterEach(() => {
  Object.assign(process.env, { NODE_ENV: "test" });
  vi.resetModules();
});

/** The account shape the demo policy judges. */
function account(overrides: Record<string, unknown> = {}) {
  const seed = SEED_ACCOUNTS[0];
  return {
    id: seed.id,
    phone: seed.phone,
    role: seed.role,
    passwordHash: seed.seedPasswordHash,
    ...overrides,
  } as never;
}

describe("auth", () => {
  describe("demo account policy", () => {
    const seedAdmin = SEED_ACCOUNTS.find((a) => a.role === "admin")!;
    const seedStudent = SEED_ACCOUNTS.find((a) => a.role === "student")!;

    it("recognises seed identities by id and by phone", async () => {
      const auth = await loadAuth("test");
      expect(auth.isSeedDemoAccount({ id: "u-sara", phone: "09000000000" })).toBe(true);
      expect(auth.isSeedDemoAccount({ id: "u-123", phone: seedStudent.phone })).toBe(true);
      expect(auth.isSeedDemoAccount({ id: "u-123", phone: "09000000000" })).toBe(false);
    });

    it("lists every non-admin seed identity as a demo profile", () => {
      expect(SEED_DEMO_ACCOUNT_IDS).toContain("u-editor");
      expect(SEED_DEMO_ACCOUNT_IDS).toContain("u-support");
      expect(SEED_DEMO_ACCOUNT_IDS).toContain("u-maryam");
      expect(SEED_DEMO_ACCOUNT_IDS).toContain("u-sara");
      expect(SEED_DEMO_ACCOUNT_IDS).not.toContain("u-admin");
    });

    it("detects an account still on its seeded password", async () => {
      const auth = await loadAuth("test");
      expect(auth.hasSeedPassword({ id: seedAdmin.id, passwordHash: seedAdmin.seedPasswordHash })).toBe(true);
      expect(auth.hasSeedPassword({ id: seedAdmin.id, passwordHash: hashPassword("rotated") })).toBe(false);
      expect(auth.hasSeedPassword({ id: "u-real", passwordHash: seedAdmin.seedPasswordHash })).toBe(false);
    });

    it("leaves every demo profile usable in development", async () => {
      const auth = await loadAuth("development");
      expect(auth.demoAccountBlocked(account({ id: "u-sara", role: "student" }))).toBe(false);
      expect(auth.demoAccountBlocked(account({ id: seedAdmin.id, role: "admin" }))).toBe(false);
    });

    it("refuses every non-admin demo profile in production", async () => {
      const auth = await loadAuth("production");
      for (const id of SEED_DEMO_ACCOUNT_IDS) {
        expect(auth.demoAccountBlocked(account({ id, phone: "09000000000", role: "editor" }))).toBe(true);
      }
    });

    it("refuses the admin demo profile only while it keeps the seeded password", async () => {
      const auth = await loadAuth("production");
      const seeded = account({ id: seedAdmin.id, phone: seedAdmin.phone, role: "admin" });
      expect(auth.demoAccountBlocked(seeded)).toBe(true);
      expect(auth.accountBlockReason(seeded)).toBe("seed-password");
      const rotated = { ...(seeded as object), passwordHash: hashPassword("a-real-password") } as never;
      expect(auth.demoAccountBlocked(rotated)).toBe(false);
      expect(auth.accountBlockReason(rotated)).toBe(null);
    });

    it("honours an explicit disable in every environment", async () => {
      const auth = await loadAuth("development");
      const off = account({ id: "u-real", phone: "09000000000", disabled: true });
      expect(auth.accountDisabled(off)).toBe(true);
      expect(auth.demoAccountBlocked(off)).toBe(true);
      expect(auth.accountBlockReason(off)).toBe("disabled");
    });

    it("never blocks a real registered user in production", async () => {
      const auth = await loadAuth("production");
      expect(
        auth.demoAccountBlocked({
          id: "u-1712",
          phone: "09121112233",
          role: "student",
          passwordHash: hashPassword("their-own-password"),
        } as never),
      ).toBe(false);
    });

    it("treats a missing account as not blocked, so login falls through to 'invalid'", async () => {
      const auth = await loadAuth("production");
      expect(auth.demoAccountBlocked(undefined)).toBe(false);
      expect(auth.demoAccountBlocked(null)).toBe(false);
    });
  });

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
