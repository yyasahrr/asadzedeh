import { hashPassword } from "../lib/auth";
import { audit } from "../lib/audit";
import { initStore, getSessions, getUsers, writeDbAsync } from "../lib/store";
import { SEED_ACCOUNTS } from "../lib/seed";
import type { User } from "../lib/types";

/**
 * Retire the development demo profiles in a real database.
 *
 *   npm run db:disable-demo            # every non-admin demo profile
 *   npm run db:disable-demo -- --all   # ...and the seeded admin too
 *   npm run db:disable-demo -- --dry-run
 *
 * The application already refuses these accounts in production (see
 * `demoAccountBlocked` in `lib/auth.ts`), so this script is belt and braces: it
 * writes the state down instead of relying on a runtime check, wipes the
 * published password hash, and revokes any session a demo profile is holding.
 *
 * Run it once, at go-live, after `npm run db:bootstrap-admin` has created the
 * real administrator.
 */

const args = process.argv.slice(2);
const includeAdmin = args.includes("--all");
const dryRun = args.includes("--dry-run");

const seedIds = new Set(SEED_ACCOUNTS.map((a) => a.id));
const seedPhones = new Set(SEED_ACCOUNTS.map((a) => a.phone));
const seedHashes = new Map(SEED_ACCOUNTS.map((a) => [a.id, a.seedPasswordHash]));

await initStore();

const users = getUsers();
const targets = users.filter((u) => {
  const isSeed = seedIds.has(u.id) || seedPhones.has(u.phone);
  if (!isSeed) return false;
  const isStaffAdmin = u.role === "admin" || u.role === "super_admin";
  if (isStaffAdmin && !includeAdmin) return false;
  // An account whose password has been rotated is a real account, not a demo one.
  return !u.disabled && seedHashes.get(u.id) === u.passwordHash;
});

if (targets.length === 0) {
  console.log("Nothing to disable: no demo profile is still active on its seeded password.");
  process.exit(0);
}

console.log(`${dryRun ? "[dry-run] " : ""}Disabling ${targets.length} demo account(s):`);
for (const u of targets) console.log(`  - ${u.id}  ${u.phone}  (${u.role})  ${u.name}`);

if (dryRun) process.exit(0);

const remainingAdmins = users.filter(
  (u) => (u.role === "admin" || u.role === "super_admin") && !targets.some((t) => t.id === u.id),
);
if (remainingAdmins.length === 0) {
  console.error(
    "Refusing to continue: this would leave the site with no administrator.\n" +
      "Create one first:  SUPER_ADMIN_PHONE=09... SUPER_ADMIN_PASSWORD='...' npm run db:bootstrap-admin",
  );
  process.exit(1);
}

const ids = new Set(targets.map((u) => u.id));
const stamp = new Date().toISOString();

await writeDbAsync({
  users: users.map((u): User =>
    ids.has(u.id)
      ? {
          ...u,
          disabled: true,
          disabledReason: "حساب نمایشی؛ در راه‌اندازی تولید غیرفعال شد",
          // An unusable hash rather than an empty one: `verifyPassword` must
          // never be handed a value it could accidentally match.
          passwordHash: hashPassword(`retired-${u.id}-${stamp}`),
          failedLogins: 0,
          lockedUntil: undefined,
        }
      : u,
  ),
  sessions: getSessions().map((s) => (ids.has(s.userId) && !s.revokedAt ? { ...s, revokedAt: stamp } : s)),
});

for (const u of targets) {
  await audit({
    action: "user.disabled",
    level: "security",
    actor: { role: "anonymous", name: "db:disable-demo" },
    target: `user:${u.id}`,
    detail: { reason: "demo-account", role: u.role, wipedPassword: true },
  });
}

console.log("Done. Sessions revoked and passwords wiped for the accounts above.");
process.exit(0);
