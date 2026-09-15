import { afterEach, describe, expect, it, vi } from "vitest";
import { users as seedUsers } from "@/lib/seed";

/**
 * Launch self-check.
 *
 * The check that matters for go-live is the one that retires demo profiles: a
 * database copied out of staging carries `u-editor`, `u-support`, `u-maryam` and
 * `u-sara` with passwords that are written in the README. In production they must
 * end up disabled with their sessions revoked, and the admin account must survive
 * — otherwise the site launches with nobody able to sign in.
 */

const APP_SECRET = "test-secret-for-ci-only-0123456789";

async function load(nodeEnv: string) {
  Object.assign(process.env, { NODE_ENV: nodeEnv, APP_SECRET, PGLITE_DIR: "memory" });
  vi.resetModules();
  const store = await import("@/lib/store");
  const launch = await import("@/lib/launch-check");
  return { store, launch };
}

/** Put the development seed (plus a live session per demo profile) in the store. */
function seedStore(store: Awaited<ReturnType<typeof load>>["store"]) {
  store.writeDb({
    users: seedUsers.map((u) => ({ ...u })),
    sessions: seedUsers.map((u, i) => ({
      token: `tok-${i}`,
      userId: u.id,
      createdAt: "۱۵ شهریور ۱۴۰۵",
      mfaVerified: false,
      ip: "127.0.0.1",
      userAgent: "test",
      lastSeen: new Date().toISOString(),
    })),
  });
}

afterEach(() => {
  Object.assign(process.env, { NODE_ENV: "test" });
  vi.resetModules();
});

describe("retireDemoAccounts", () => {
  it("disables every non-admin demo profile and revokes its session in production", async () => {
    const { store, launch } = await load("production");
    seedStore(store);

    const retired = launch.retireDemoAccounts();

    expect(retired.sort()).toEqual(["u-editor", "u-maryam", "u-sara", "u-support"]);
    for (const id of retired) {
      const user = store.getUserById(id);
      expect(user?.disabled).toBe(true);
      expect(user?.disabledReason).toBeTruthy();
      expect(store.getSessions().filter((s) => s.userId === id).every((s) => Boolean(s.revokedAt))).toBe(true);
    }
  });

  it("leaves the admin account alone", async () => {
    const { store, launch } = await load("production");
    seedStore(store);
    launch.retireDemoAccounts();
    const admin = seedUsers.find((u) => u.role === "admin")!;
    expect(store.getUserById(admin.id)?.disabled).toBeUndefined();
    expect(store.getSessions().find((s) => s.userId === admin.id)?.revokedAt).toBeUndefined();
  });

  it("is idempotent across restarts", async () => {
    const { store, launch } = await load("production");
    seedStore(store);
    expect(launch.retireDemoAccounts()).toHaveLength(4);
    expect(launch.retireDemoAccounts()).toHaveLength(0);
  });

  it("touches nothing outside production", async () => {
    const { store, launch } = await load("development");
    seedStore(store);
    expect(launch.retireDemoAccounts()).toHaveLength(0);
    expect(store.getUsers().some((u) => u.disabled)).toBe(false);
  });

  it("leaves a real registered user alone in production", async () => {
    const { store, launch } = await load("production");
    seedStore(store);
    store.writeDb({
      users: [
        ...store.getUsers(),
        {
          id: "u-real",
          name: "هنرجوی واقعی",
          phone: "09121119999",
          passwordHash: "salt:hash",
          role: "student",
          createdAt: "۱۵ شهریور ۱۴۰۵",
        },
      ],
    });
    const retired = launch.retireDemoAccounts();
    expect(retired).not.toContain("u-real");
    expect(store.getUserById("u-real")?.disabled).toBeUndefined();
  });
});

describe("runLaunchChecks", () => {
  it("reports a locked-out administration instead of launching silently", async () => {
    const { store, launch } = await load("production");
    // Only the seeded admin exists, still on the published development password.
    store.writeDb({ users: seedUsers.filter((u) => u.role === "admin").map((u) => ({ ...u })) });

    const report = await launch.runLaunchChecks();

    expect(report.findings.some((f) => f.code === "ADMIN_LOCKED_OUT")).toBe(true);
    expect(report.findings.some((f) => f.code === "INTEGRATION")).toBe(true);
    expect(report.integrations.payment.configured).toBe(false);
    expect(report.integrations.sms.configured).toBe(false);
  });

  it("is clean once a real admin and both integrations exist", async () => {
    Object.assign(process.env, {
      ZIBAL_MERCHANT: "zibal-merchant-123",
      MELIPAYAMAK_USERNAME: "asadzedeh-user",
      MELIPAYAMAK_PASSWORD: "panel-secret",
    });
    const { store, launch } = await load("production");
    store.writeDb({
      users: [
        {
          id: "u-super-1",
          name: "مدیر ارشد",
          phone: "09120009999",
          passwordHash: "salt:real-hash",
          role: "super_admin",
          createdAt: "۱۵ شهریور ۱۴۰۵",
        },
      ],
    });

    const report = await launch.runLaunchChecks();

    expect(report.findings).toEqual([]);
    expect(report.integrations.payment).toMatchObject({ configured: true, provider: "zibal", sandbox: false });
    expect(report.integrations.sms).toMatchObject({ configured: true, provider: "melipayamak" });
    delete process.env.ZIBAL_MERCHANT;
    delete process.env.MELIPAYAMAK_USERNAME;
    delete process.env.MELIPAYAMAK_PASSWORD;
  });
});
