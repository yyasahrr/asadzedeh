import path from "node:path";

/**
 * Shared E2E environment.
 * Kept out of playwright.config.ts so global-setup can import it without a
 * circular dependency on the config module.
 */

export const E2E_PORT = Number(process.env.E2E_PORT || 4321);
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
export const E2E_DB_DIR = path.join("data", "pglite-e2e");

export const E2E_ADMIN_PHONE = "09120009999";
export const E2E_ADMIN_PASSWORD = "E2eAdmin!2345678";

export const e2eEnv: Record<string, string> = {
  NODE_ENV: "development",
  PORT: String(E2E_PORT),
  HOSTNAME: "127.0.0.1",
  PGLITE_DIR: E2E_DB_DIR,
  STORE_WAL_PATH: path.join("data", ".store-wal-e2e.json"),
  APP_SECRET: "e2e-only-secret-do-not-use-anywhere-else",
  NEXT_PUBLIC_APP_URL: E2E_BASE_URL,
  ALLOW_DEMO_PAYMENT: "true",
};
