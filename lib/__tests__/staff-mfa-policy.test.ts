import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Staff 2FA policy.
 *
 * The admin-toggleable setting is a convenience for staging and local
 * development. A production deployment must not be able to run with staff 2FA
 * switched off, because one leaked password would then hand over the admin
 * panel. These tests pin that the override holds and that the exemptions still
 * behave.
 *
 * `getEnv()` memoises on first call, so each case resets the module registry and
 * re-imports — mutating NODE_ENV in place would not be observed.
 */

const APP_SECRET = "test-secret-for-ci-only-0123456789";

const staff = (over: Record<string, unknown> = {}) =>
  ({
    id: "u-1",
    role: "manager",
    name: "مدیر",
    totpEnabled: false,
    mfaVerified: false,
    ...over,
  }) as never;

async function load(nodeEnv: string, requireStaff2fa: boolean) {
  Object.assign(process.env, { NODE_ENV: nodeEnv, APP_SECRET, PGLITE_DIR: "memory" });
  vi.resetModules();

  const store = await import("@/lib/store");
  const settings = store.getSettings();
  store.writeDb({
    settings: { ...settings, security: { ...settings.security, requireStaff2fa } },
  });

  const auth = await import("@/lib/auth");
  return { auth, store };
}

afterEach(() => {
  Object.assign(process.env, { NODE_ENV: "test" });
  vi.resetModules();
});

describe("staffMfaRequired", () => {
  it("follows the stored setting outside production", async () => {
    const { auth } = await load("test", false);
    expect(auth.staffMfaRequired()).toBe(false);
  });

  it("is true in production even when the setting is off", async () => {
    const { auth } = await load("production", false);
    expect(auth.staffMfaRequired()).toBe(true);
  });

  it("stays true in production when the setting is already on", async () => {
    const { auth } = await load("production", true);
    expect(auth.staffMfaRequired()).toBe(true);
  });
});

describe("needsMfa", () => {
  it("returns none for a non-staff user or no user at all", async () => {
    const { auth } = await load("production", false);
    expect(auth.needsMfa(staff({ role: "student" }))).toBe("none");
    expect(auth.needsMfa(null)).toBe("none");
  });

  it("ignores stale TOTP on non-owner accounts", async () => {
    const { auth } = await load("test", false);
    expect(auth.needsMfa(staff({ totpEnabled: true, mfaVerified: false }))).toBe("none");
  });

  it("does not demand enrolment from ordinary staff even when the legacy policy is on", async () => {
    const { auth } = await load("test", true);
    expect(auth.needsMfa(staff())).toBe("none");
  });

  it("does not demand enrolment when the policy is off outside production", async () => {
    const { auth } = await load("test", false);
    expect(auth.needsMfa(staff())).toBe("none");
  });

  it("never requires TOTP from instructors, including stale legacy configuration", async () => {
    const { auth } = await load("production", true);
    expect(auth.needsMfa(staff({ role: "instructor" }))).toBe("none");
    expect(auth.needsMfa(staff({ role: "instructor", totpEnabled: true }))).toBe("none");
  });

  it("requires enrolment only from super_admin in production", async () => {
    const { auth } = await load("production", false);
    expect(auth.needsMfa(staff({ role: "super_admin" }))).toBe("enrol");
    expect(auth.needsMfa(staff({ role: "super_admin", totpEnabled: true }))).toBe("verify");
    for (const role of ["admin", "manager", "editor", "support", "instructor"]) {
      expect(auth.needsMfa(staff({ role })), role).toBe("none");
    }
  });
});
