import fs from "node:fs";
import path from "node:path";

/** List uploaded images (server-only). */
export function listMedia(): string[] {
  try {
    return fs
      .readdirSync(path.join(process.cwd(), "public", "uploads"))
      .filter((f) => /\.(png|jpe?g|webp|gif|svg)$/i.test(f))
      .map((f) => `/uploads/${f}`)
      .reverse();
  } catch {
    return [];
  }
}
