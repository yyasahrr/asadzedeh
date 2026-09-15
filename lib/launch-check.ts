import { accountBlockReason, hasSeedPassword, isSeedDemoAccount } from "./auth";
import { audit } from "./audit";
import { isProduction } from "./env";
import { integrationStatus, integrationWarnings } from "./integrations";
import { logger } from "./logger";
import { getSessions, getSettings, getUsers, writeDb } from "./store";
import type { User } from "./types";

/**
 * Launch self-check.
 *
 * Runs once at server start (see `instrumentation-node.ts`) and again on demand
 * from `/api/health`. It exists because the two ways a Next.js deployment goes
 * wrong on day one are silent: a database copied out of staging still holding
 * demo profiles, and a shop whose payment gateway was never configured. Both
 * look like a working site until the first customer.
 *
 * The one thing it changes is demo accounts, and only in production — retiring
 * them is the point of the check. Everything else is reported, never mutated:
 * an operator who has deliberately left a gateway unconfigured while they wait
 * for credentials must not find their settings rewritten behind their back.
 */

export interface LaunchFinding {
  code: string;
  level: "info" | "warn" | "error";
  message: string;
}

export interface LaunchReport {
  environment: string;
  demoAccountsRetired: string[];
  /** Admin identities that are currently refused because they kept the seed password. */
  adminsOnSeedPassword: string[];
  integrations: ReturnType<typeof integrationStatus>;
  findings: LaunchFinding[];
}

const RETIRE_REASON = "حساب نمایشی؛ در راه‌اندازی تولید غیرفعال شد";

/**
 * Switch off every non-admin demo profile and cut its live sessions.
 *
 * Idempotent: an already-disabled account is left alone, so repeated restarts
 * produce no repeated audit entries. The admin demo profile is *not* retired —
 * it is refused by `demoAccountBlocked` while it keeps the published password
 * and becomes a normal account the moment that password is rotated, which is
 * what an operator launching the site actually wants.
 */
export function retireDemoAccounts(): string[] {
  if (!isProduction()) return [];

  const users = getUsers();
  const targets = users.filter(
    (u) =>
      !u.disabled &&
      u.role !== "admin" &&
      u.role !== "super_admin" &&
      isSeedDemoAccount(u) &&
      hasSeedPassword(u),
  );
  if (targets.length === 0) return [];

  const ids = new Set(targets.map((u) => u.id));
  const stamp = new Date().toISOString();

  writeDb({
    users: users.map((u): User =>
      ids.has(u.id) ? { ...u, disabled: true, disabledReason: RETIRE_REASON } : u,
    ),
    // A retired profile must not keep a working session cookie.
    sessions: getSessions().map((s) => (ids.has(s.userId) && !s.revokedAt ? { ...s, revokedAt: stamp } : s)),
  });

  for (const u of targets) {
    void audit({
      action: "user.disabled",
      level: "security",
      actor: { role: "anonymous", name: "launch-check" },
      target: `user:${u.id}`,
      detail: { reason: "demo-account", role: u.role },
    });
  }
  logger.warn({
    event: "launch.demo_accounts.retired",
    count: targets.length,
    ids: targets.map((u) => u.id),
  });
  return targets.map((u) => u.id);
}

/** Full launch picture, safe to log and to expose on the health endpoint. */
export async function runLaunchChecks(): Promise<LaunchReport> {
  const retired = retireDemoAccounts();
  const findings: LaunchFinding[] = [];

  const users = getUsers();
  const refusedAdmins = users.filter((u) => {
    if (u.role !== "admin" && u.role !== "super_admin") return false;
    return accountBlockReason(u) !== null;
  });

  if (isProduction() && refusedAdmins.length > 0 && users.every((u) => accountBlockReason(u) !== null)) {
    findings.push({
      code: "ADMIN_LOCKED_OUT",
      level: "error",
      message:
        "هیچ حساب مدیری قابل ورود نیست. یک مدیر واقعی بسازید: npm run db:bootstrap-admin",
    });
  } else if (isProduction() && refusedAdmins.length > 0) {
    findings.push({
      code: "ADMIN_SEED_PASSWORD",
      level: "warn",
      message: `${refusedAdmins.length} حساب مدیر هنوز رمز توسعه دارد و تا تغییر رمز رد می‌شود.`,
    });
  }

  if (isProduction() && users.length === 0) {
    findings.push({
      code: "NO_ADMIN_ACCOUNT",
      level: "error",
      message: "پایگاه‌داده هیچ کاربری ندارد؛ با npm run db:bootstrap-admin نخستین مدیر را بسازید.",
    });
  }

  for (const message of integrationWarnings()) {
    findings.push({ code: "INTEGRATION", level: "warn", message });
  }

  const security = getSettings().security;
  if (!isProduction() && security.requireStaff2fa === false) {
    findings.push({
      code: "STAFF_2FA_OFF",
      level: "info",
      message: "۲FA کارکنان خاموش است (در تولید همیشه اجباری است).",
    });
  }

  for (const f of findings) {
    if (f.level === "error") logger.error({ event: "launch.check", code: f.code, message: f.message });
    else if (f.level === "warn") logger.warn({ event: "launch.check", code: f.code, message: f.message });
    else logger.info({ event: "launch.check", code: f.code, message: f.message });
  }
  if (findings.length === 0) logger.info({ event: "launch.check.clean" });

  return {
    environment: process.env.NODE_ENV ?? "development",
    demoAccountsRetired: retired,
    adminsOnSeedPassword: refusedAdmins.map((u) => u.id),
    integrations: integrationStatus(),
    findings,
  };
}
