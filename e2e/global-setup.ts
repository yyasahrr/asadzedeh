import fs from "node:fs";
import path from "node:path";
import { E2E_ADMIN_PASSWORD, E2E_ADMIN_PHONE, E2E_DB_DIR, e2eEnv } from "./env";

// Must happen before lib/db/client is imported: it reads process.env lazily and
// caches the result.
Object.assign(process.env, e2eEnv);

/**
 * Build a clean, disposable database for the E2E run:
 *  1. delete any previous E2E database,
 *  2. apply migrations + the development seed,
 *  3. create a known super admin the specs can log in with.
 */
export default async function globalSetup() {
  fs.rmSync(E2E_DB_DIR, { recursive: true, force: true });
  fs.rmSync(e2eEnv.STORE_WAL_PATH, { force: true });
  fs.mkdirSync(path.dirname(E2E_DB_DIR), { recursive: true });

  const { runMigrations } = await import("../lib/db/migrate");
  const store = await import("../lib/store");
  const { hashPassword } = await import("../lib/auth");

  await runMigrations();
  await store.initStore();

  const existing = store.getUserByPhone(E2E_ADMIN_PHONE);
  const admin = {
    id: existing?.id ?? "u-e2e-admin",
    name: "مدیر تست خودکار",
    phone: E2E_ADMIN_PHONE,
    passwordHash: hashPassword(E2E_ADMIN_PASSWORD),
    role: "super_admin" as const,
    createdAt: new Date().toISOString(),
  };

  await store.writeDbAsync({
    users: existing
      ? store.getUsers().map((u) => (u.id === existing.id ? { ...u, ...admin } : u))
      : [...store.getUsers(), admin],
  });
  await store.flushStore();

  const { closeDb } = await import("../lib/db/client");
  await closeDb();

  console.log(
    `[e2e] database ready at ${E2E_DB_DIR} — ${store.getUsers().length} users, admin ${E2E_ADMIN_PHONE}`,
  );
}
