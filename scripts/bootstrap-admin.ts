import { hashPassword } from "../lib/auth";
import { getUserByPhone, getUsers, initStore, writeDbAsync } from "../lib/store";

const phone = process.env.SUPER_ADMIN_PHONE || process.argv[2];
const password = process.env.SUPER_ADMIN_PASSWORD || process.argv[3];
const name = process.env.SUPER_ADMIN_NAME || "مدیر ارشد";

if (!phone || !password || password.length < 12) {
  console.error("Usage: SUPER_ADMIN_PHONE=09... SUPER_ADMIN_PASSWORD='long-secret' npm run db:bootstrap-admin");
  process.exit(1);
}

await initStore();
const existing = getUserByPhone(phone);
if (existing) {
  if (existing.role === "super_admin" || existing.role === "admin") {
    console.log("An admin with this phone already exists. No change.");
    process.exit(0);
  }
  await writeDbAsync({
    users: getUsers().map((u) =>
      u.id === existing.id ? { ...u, role: "super_admin", passwordHash: hashPassword(password), name } : u,
    ),
  });
  console.log("Existing user promoted to super_admin.");
  process.exit(0);
}

if (getUsers().some((u) => u.role === "super_admin" || u.role === "admin")) {
  console.error("An admin already exists. Promotion of a new phone is refused. Sign in and use /admin/users.");
  process.exit(1);
}

await writeDbAsync({
  users: [
    ...getUsers(),
    {
      id: `u-super-${Date.now().toString(36)}`,
      name,
      phone,
      passwordHash: hashPassword(password),
      role: "super_admin",
      createdAt: new Date().toISOString(),
    },
  ],
});
console.log("super_admin created. Public registration cannot create admins.");
process.exit(0);
