import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.git/**", "**/.kilo/**", "**/.kilo/worktrees/**", "**/.next/**"],
    globals: true,
    // Each file boots its own in-memory PGlite database; keep them isolated.
    isolate: true,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // PostgreSQL suites each boot a real server. Serial files avoid port/initdb
    // contention on small CI runners while tests inside a suite still exercise
    // true concurrent database connections.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": import.meta.dirname,
      "server-only": `${import.meta.dirname}/lib/__tests__/helpers/server-only.ts`,
    },
  },
});
