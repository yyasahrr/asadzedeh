import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    globals: true,
    // Each file boots its own in-memory PGlite database; keep them isolated.
    isolate: true,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
});
