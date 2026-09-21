import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { call, loginAs, runtime } from "./helpers/next-runtime";

let actions: typeof import("@/app/account/security/actions");
let auth: typeof import("@/lib/auth");
let store: typeof import("@/lib/store");
let totpLib: typeof import("@/lib/totp");
let serial = 0;
let ownerId = "";
let oldPhone = "";
let newPhone = "";
const secret = "JBSWY3DPEHPK3PXP";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

function code(): string {
  return totpLib.totp(secret);
}

beforeAll(async () => {
  Object.assign(process.env, { NODE_ENV: "test", PGLITE_DIR: "memory", APP_SECRET: "owner-recovery-test-secret-0123456789" });
  store = await import("@/lib/store");
  auth = await import("@/lib/auth");
  totpLib = await import("@/lib/totp");
  await store.initStore();
  actions = await import("@/app/account/security/actions");
});

beforeEach(async () => {
  serial += 1;
  ownerId = `recovery-owner-${serial}`;
  oldPhone = `0914${String(1000000 + serial).slice(-7)}`;
  newPhone = `0991${String(2000000 + serial).slice(-7)}`;
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 60 * 60_000).toISOString();
  runtime().cookies.clear();
  store.writeDb({
    users: [...store.getUsers(), {
      id: ownerId, name: "مالک بازیابی", phone: oldPhone, role: "super_admin", createdAt: now,
      passwordHash: auth.hashPassword("forgotten-old-password"), accessProfileId: "owner-profile",
      permissionOverrides: { allow: ["content"] }, failedLogins: 4, lockedUntil: new Date(Date.now() - 60_000).toISOString(),
      totp: { enabled: true, secret, recoveryCodes: ["recovery-one", "recovery-two"], enabledAt: now },
    }],
    sessions: [...store.getSessions(),
      { token: `tok-${ownerId}`, userId: ownerId, createdAt: now, lastSeen: now, expiresAt: later, mfaVerified: true },
      { token: `other-${ownerId}`, userId: ownerId, createdAt: now, lastSeen: now, expiresAt: later, mfaVerified: true },
    ],
  });
  await store.flushStore();
  loginAs(ownerId);
});

describe("owner TOTP recovery", () => {
  it("denies non-super-admin and an owner without TOTP", async () => {
    const now = new Date().toISOString();
    const later = new Date(Date.now() + 60_000).toISOString();
    const studentId = `recovery-student-${serial}`;
    store.writeDb({
      users: [...store.getUsers(), { id: studentId, name: "هنرجو", phone: `0901${String(3000000 + serial).slice(-7)}`, role: "student", passwordHash: "x", createdAt: now }],
      sessions: [...store.getSessions(), { token: `tok-${studentId}`, userId: studentId, createdAt: now, lastSeen: now, expiresAt: later }],
    });
    loginAs(studentId);
    expect((await call(() => actions.changeOwnerPhoneWithTotp(form({ newPhone, totpCode: code() })))).redirected).toBe("/auth?next=/account/security");

    store.writeDb({ users: store.getUsers().map((user) => user.id === ownerId ? { ...user, totp: undefined } : user) });
    loginAs(ownerId);
    expect((await call(() => actions.resetOwnerPasswordWithTotp(form({ newPassword: "new-owner-passphrase", confirmPassword: "new-owner-passphrase", totpCode: code() })))).redirected)
      .toBe("/account/security?ownerRecoveryError=totp-required");
  });

  it("rejects invalid TOTP, malformed, same, and duplicate phones", async () => {
    expect((await call(() => actions.changeOwnerPhoneWithTotp(form({ newPhone, totpCode: "000000" })))).redirected).toBe("/account/security?ownerRecoveryError=totp");
    expect((await call(() => actions.changeOwnerPhoneWithTotp(form({ newPhone: "123", totpCode: code() })))).redirected).toBe("/account/security?ownerRecoveryError=format");
    expect((await call(() => actions.changeOwnerPhoneWithTotp(form({ newPhone: oldPhone, totpCode: code() })))).redirected).toBe("/account/security?ownerRecoveryError=same");
    store.writeDb({ users: [...store.getUsers(), { id: `duplicate-recovery-${serial}`, name: "دیگری", phone: newPhone, role: "student", passwordHash: "x", createdAt: "today" }] });
    expect((await call(() => actions.changeOwnerPhoneWithTotp(form({ newPhone, totpCode: code() })))).redirected).toBe("/account/security?ownerRecoveryError=duplicate");
    expect(store.getUserById(ownerId)?.phone).toBe(oldPhone);
  });

  it("changes only the owner identity phone, preserves account/TOTP/history, and revokes other sessions", async () => {
    const beforeOrders = JSON.stringify(store.getOrders());
    const beforeInstructors = JSON.stringify(store.getInstructors());
    const before = store.getUserById(ownerId)!;
    const outcome = await call(() => actions.changeOwnerPhoneWithTotp(form({ newPhone: `+98${newPhone.slice(1)}`, totpCode: code() })));
    expect(outcome.redirected).toBe("/account/security?saved=phone-totp");
    const changed = store.getUserById(ownerId)!;
    expect(store.getUserByPhone(oldPhone)).toBeUndefined();
    expect(store.getUserByPhone(newPhone)?.id).toBe(ownerId);
    expect(changed).toMatchObject({ role: before.role, accessProfileId: before.accessProfileId, permissionOverrides: before.permissionOverrides });
    expect(changed.totp?.secret).toBe(secret);
    expect(changed.totp?.recoveryCodes).toEqual(before.totp?.recoveryCodes);
    expect(store.getSessions().filter((session) => session.userId === ownerId).map((session) => session.token)).toEqual([`tok-${ownerId}`]);
    expect((await auth.getSessionUser())?.phone).toBe(newPhone);
    expect(JSON.stringify(store.getOrders())).toBe(beforeOrders);
    expect(JSON.stringify(store.getInstructors())).toBe(beforeInstructors);

    const audit = store.getAudit().find((entry) => entry.action === "auth.phone.changed_with_totp");
    expect(audit?.detail).toMatchObject({ verificationMethod: "totp", phoneOwnershipVerified: false });
    expect(JSON.stringify(audit)).not.toContain(oldPhone);
    expect(JSON.stringify(audit)).not.toContain(newPhone);
    expect(JSON.stringify(audit)).not.toContain(code());
  });

  it("rejects short/mismatched passwords and invalid TOTP", async () => {
    expect((await call(() => actions.resetOwnerPasswordWithTotp(form({ newPassword: "short", confirmPassword: "short", totpCode: code() })))).redirected)
      .toBe("/account/security?ownerRecoveryError=password-length");
    expect((await call(() => actions.resetOwnerPasswordWithTotp(form({ newPassword: "new-owner-passphrase", confirmPassword: "different-passphrase", totpCode: code() })))).redirected)
      .toBe("/account/security?ownerRecoveryError=password-match");
    expect((await call(() => actions.resetOwnerPasswordWithTotp(form({ newPassword: "new-owner-passphrase", confirmPassword: "new-owner-passphrase", totpCode: "000000" })))).redirected)
      .toBe("/account/security?ownerRecoveryError=totp");
  });

  it("resets a forgotten password, clears lock state, preserves TOTP, and keeps only the current session", async () => {
    const recoveryCodes = [...store.getUserById(ownerId)!.totp!.recoveryCodes];
    const outcome = await call(() => actions.resetOwnerPasswordWithTotp(form({
      newPassword: "new-owner-passphrase", confirmPassword: "new-owner-passphrase", totpCode: code(),
    })));
    expect(outcome.redirected).toBe("/account/security?saved=password-totp");
    const changed = store.getUserById(ownerId)!;
    expect(auth.verifyPassword("new-owner-passphrase", changed.passwordHash)).toBe(true);
    expect(auth.verifyPassword("forgotten-old-password", changed.passwordHash)).toBe(false);
    expect(changed.failedLogins).toBe(0);
    expect(changed.lockedUntil).toBeUndefined();
    expect(changed.totp?.secret).toBe(secret);
    expect(changed.totp?.recoveryCodes).toEqual(recoveryCodes);
    expect(store.getSessions().filter((session) => session.userId === ownerId).map((session) => session.token)).toEqual([`tok-${ownerId}`]);
    expect((await auth.getSessionUser())?.id).toBe(ownerId);
    const audit = store.getAudit().find((entry) => entry.action === "auth.password.reset_with_totp");
    expect(JSON.stringify(audit)).not.toContain("new-owner-passphrase");
    expect(JSON.stringify(audit)).not.toContain(changed.passwordHash);
    expect(JSON.stringify(audit)).not.toContain(code());
  });

  it("cannot reuse one accepted TOTP timestep for a second sensitive operation", async () => {
    const currentCode = code();
    expect((await call(() => actions.changeOwnerPhoneWithTotp(form({ newPhone, totpCode: currentCode })))).redirected).toBe("/account/security?saved=phone-totp");
    const replay = await call(() => actions.resetOwnerPasswordWithTotp(form({
      newPassword: "another-owner-pass", confirmPassword: "another-owner-pass", totpCode: currentCode,
    })));
    expect(replay.redirected).toBe("/account/security?ownerRecoveryError=replay");
    expect(auth.verifyPassword("forgotten-old-password", store.getUserById(ownerId)!.passwordHash)).toBe(true);
  });
});
