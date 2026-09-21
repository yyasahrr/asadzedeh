import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Staff 2FA policy.
 *
 * TOTP is optional by default. Only the explicit stored policy may require it;
 * a production environment or stale account secret must not silently turn a
 * selected password/OTP login into a chained login.
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

  it("does not silently enable 2FA in production", async () => {
    const { auth } = await load("production", false);
    expect(auth.staffMfaRequired()).toBe(false);
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

  it("does not challenge super_admin when the explicit policy is off", async () => {
    const { auth } = await load("production", false);
    expect(auth.needsMfa(staff({ role: "super_admin" }))).toBe("none");
    expect(auth.needsMfa(staff({ role: "super_admin", totpEnabled: true }))).toBe("none");
    for (const role of ["admin", "manager", "editor", "support", "instructor"]) {
      expect(auth.needsMfa(staff({ role })), role).toBe("none");
    }
  });

  it("honours an explicit owner 2FA policy without affecting other roles", async () => {
    const { auth } = await load("production", true);
    expect(auth.needsMfa(staff({ role: "super_admin" }))).toBe("enrol");
    expect(auth.needsMfa(staff({ role: "super_admin", totpEnabled: true }))).toBe("verify");
    expect(auth.needsMfa(staff({ role: "admin", totpEnabled: true }))).toBe("none");
  });
});
