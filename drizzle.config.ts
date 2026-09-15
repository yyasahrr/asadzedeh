import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://asadzedeh:asadzedeh@127.0.0.1:5432/asadzedeh",
  },
  strict: true,
  verbose: true,
});
