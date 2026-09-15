import { accountDisabled, hasSeedPassword, hashPassword } from "../lib/auth";
import { audit } from "../lib/audit";
import { getSessions, getUserByPhone, getUsers, initStore, writeDbAsync } from "../lib/store";
import type { User } from "../lib/types";

const phone = process.env.SUPER_ADMIN_PHONE || process.argv[2];
const password = process.env.SUPER_ADMIN_PASSWORD || process.argv[3];
const name = process.env.SUPER_ADMIN_NAME || "مدیر ارشد";

if (!phone || !password || password.length < 12) {
  console.error("Usage: SUPER_ADMIN_PHONE=09... SUPER_ADMIN_PASSWORD='long-secret' npm run db:bootstrap-admin");
  process.exit(1);
}

await initStore();

/**
 * Would the running site actually let this admin in?
 *
 * The seeded `u-admin` is refused in production while it keeps the published
 * development password (see `demoAccountBlocked`), so counting it as "an admin
 * exists" would leave a fresh deployment with nobody able to sign in and no way
 * to create somebody who can — the exact deadlock this script exists to break.
 *
 * Deliberately *not* environment-dependent: this is a go-live tool, and it must
 * reach the same verdict in a shell that forgot `NODE_ENV=production` as it does
 * on the server.
 */
function launchUsable(u: User): boolean {
  if (u.role !== "super_admin" && u.role !== "admin") return false;
  return !accountDisabled(u) && !hasSeedPassword(u);
}

const usableAdmins = getUsers().filter(launchUsable);

const existing = getUserByPhone(phone);
const stamp = new Date().toISOString();

/** Any demo/seed admin left over from a staging copy: switch it off for good. */
async function retireBlockedAdmins() {
  const blocked = getUsers().filter(
    (u) => (u.role === "super_admin" || u.role === "admin") && !launchUsable(u),
  );
  if (blocked.length === 0) return;
  const ids = new Set(blocked.map((u) => u.id));
  await writeDbAsync({
    users: getUsers().map((u): User =>
      ids.has(u.id)
        ? {
            ...u,
            disabled: true,
            disabledReason: "حساب مدیر نمایشی؛ با ساخت مدیر واقعی غیرفعال شد",
            passwordHash: hashPassword(`retired-${u.id}-${stamp}`),
          }
        : u,
    ),
    sessions: getSessions().map((s) => (ids.has(s.userId) && !s.revokedAt ? { ...s, revokedAt: stamp } : s)),
  });
  for (const u of blocked) {
    await audit({
      action: "user.disabled",
      level: "security",
      actor: { role: "anonymous", name: "db:bootstrap-admin" },
      target: `user:${u.id}`,
      detail: { reason: "demo-admin", role: u.role },
    });
  }
  console.log(`Disabled ${blocked.length} blocked demo admin account(s): ${blocked.map((u) => u.id).join(", ")}`);
}

if (existing) {
  if (launchUsable(existing)) {
    console.log("A usable admin with this phone already exists. No change.");
    process.exit(0);
  }
  await writeDbAsync({
    users: getUsers().map((u): User =>
      u.id === existing.id
        ? {
            ...u,
            role: "super_admin",
            passwordHash: hashPassword(password),
            name,
            disabled: false,
            disabledReason: undefined,
            failedLogins: 0,
            lockedUntil: undefined,
          }
        : u,
    ),
  });
  await audit({
    action: "user.promoted",
    level: "security",
    actor: { role: "anonymous", name: "db:bootstrap-admin" },
    target: `user:${existing.id}`,
    detail: { role: "super_admin" },
  });
  await retireBlockedAdmins();
  console.log("Existing user promoted to super_admin and given a new password.");
  process.exit(0);
}

if (usableAdmins.length > 0) {
  console.error(
    `A usable admin already exists (${usableAdmins.map((u) => u.id).join(", ")}). ` +
      "Promotion of a new phone is refused. Sign in and use /admin/users.",
  );
  process.exit(1);
}

const id = `u-super-${Date.now().toString(36)}`;
await writeDbAsync({
  users: [
    ...getUsers(),
    {
      id,
      name,
      phone,
      passwordHash: hashPassword(password),
      role: "super_admin",
      createdAt: new Date().toISOString(),
    },
  ],
});
await audit({
  action: "user.created",
  level: "security",
  actor: { role: "anonymous", name: "db:bootstrap-admin" },
  target: `user:${id}`,
  detail: { role: "super_admin" },
});
await retireBlockedAdmins();
console.log(`super_admin created (${id}). Public registration cannot create admins.`);
process.exit(0);
