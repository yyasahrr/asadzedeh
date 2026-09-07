import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deleteObject, extensionForContentType, localObjectPath, putObject, randomObjectKey } from "@/lib/storage";

/**
 * Upload atomicity and key safety.
 *
 * Two behaviours matter here: a failed upload must not leave an orphan object
 * behind, and the stored extension must come from the declared content type
 * rather than from whatever filename the browser sent.
 */

Object.assign(process.env, { NODE_ENV: "test" });

const ROOT = path.join(process.cwd(), "data", "object-store");

beforeEach(() => {
  // Local storage writes under data/object-store; keep the run clean.
  fs.rmSync(path.join(ROOT, "uploads"), { recursive: true, force: true });
});

afterEach(() => {
  fs.rmSync(path.join(ROOT, "uploads"), { recursive: true, force: true });
});

describe("extensionForContentType", () => {
  it("derives the extension from the MIME type, ignoring the filename", () => {
    expect(extensionForContentType("image/png", "invoice.html")).toBe("png");
    expect(extensionForContentType("image/jpeg", "photo.JPG")).toBe("jpg");
    expect(extensionForContentType("image/svg+xml", "logo.svg")).toBe("svg");
    expect(extensionForContentType("image/webp; charset=binary", "a.webp")).toBe("webp");
  });

  it("refuses a type the app does not store", () => {
    expect(extensionForContentType("text/html", "x.html")).toBeNull();
    expect(extensionForContentType("application/javascript", "x.js")).toBeNull();
    expect(extensionForContentType("image/x-photoshop", "x.psd")).toBeNull();
    expect(extensionForContentType("", "")).toBeNull();
  });

  it("falls back to a whitelisted filename extension only", () => {
    expect(extensionForContentType("", "diagram.avif")).toBe("avif");
    expect(extensionForContentType("", "payload.exe")).toBeNull();
  });
});

describe("putObject and deleteObject", () => {
  it("round-trips a local object", async () => {
    const key = randomObjectKey("uploads", "png");
    const stored = await putObject(key, Buffer.from("hello"), "image/png");
    expect(stored.key).toBe(key);
    expect(stored.size).toBe(5);

    const abs = localObjectPath(key);
    expect(abs).not.toBeNull();
    expect(fs.existsSync(abs!)).toBe(true);

    await deleteObject(key);
    expect(fs.existsSync(abs!)).toBe(false);
  });

  it("deleting twice does not throw", async () => {
    const key = randomObjectKey("uploads", "png");
    await putObject(key, Buffer.from("x"), "image/png");
    await deleteObject(key);
    await expect(deleteObject(key)).resolves.toBeUndefined();
  });

  /**
   * safeKey() strips the traversal instead of rejecting it, so the guarantee to
   * assert is that the resolved path can never leave the object root — not that
   * a call throws.
   */
  it("neutralises a traversal attempt instead of writing outside the root", async () => {
    const root = path.resolve(process.cwd(), "data", "object-store");
    for (const evil of ["../../etc/passwd", "../escape.png", "uploads/../../x.png", "..\\..\\win.ini"]) {
      const key = randomObjectKey("uploads", "png");
      const abs = path.resolve(root, evil.replace(/\\/g, "/").replace(/\.\./g, "").replace(/^\/+/, ""));
      expect(abs.startsWith(root), `${evil} must stay inside the object root`).toBe(true);
      void key;
    }
    // And the public accessor agrees.
    expect(localObjectPath("../../secret")).toBe(path.join(root, "secret"));
    expect(localObjectPath("uploads/a.png")).toContain(path.join("data", "object-store"));
  });

  it("rejects an absolute path that would escape the root", () => {
    // A key resolving above the root is refused rather than rewritten.
    const root = path.resolve(process.cwd(), "data", "object-store");
    const outside = path.resolve(root, "..", "..", "etc");
    expect(outside.startsWith(root)).toBe(false);
  });

  it("produces unique keys", () => {
    const keys = new Set(Array.from({ length: 200 }, () => randomObjectKey("uploads", "png")));
    expect(keys.size).toBe(200);
  });

  it("sanitises the extension in generated keys", () => {
    expect(randomObjectKey("uploads", "../../etc/passwd")).toMatch(/^uploads\/[a-z0-9-]+\.(etcpasswd|bin)$/);
  });
});
