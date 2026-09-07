import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, e2eEnv } from "./e2e/env";

/**
 * E2E configuration.
 *
 * The suite runs against a real Next.js server backed by its own throwaway
 * PGlite database (`data/pglite-e2e`), so it can never touch a developer's data.
 * Demo payment is enabled on purpose: it is the only way to exercise the whole
 * checkout → verification → enrolment path without gateway credentials.
 *
 * Requires a Playwright browser: `npx playwright install --with-deps chromium`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // One server, one shared database — tests must not run in parallel.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "fa-IR",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && node server.mjs",
    url: `${E2E_BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...e2eEnv } as Record<string, string>,
  },
});
