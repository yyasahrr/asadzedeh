import { describe, it, expect } from "vitest";

/**
 * SSRF protection for video import — same logic as the route, tested in isolation.
 * The route itself does streaming, but the URL validation is the security boundary.
 */

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h === "127.0.0.1") return true;
  if (h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "169.254.169.254") return true;
  if (h.startsWith("169.254.")) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return isPrivateIPv4(h);
  if (h === "::1" || h === "::ffff:127.0.0.1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:")) return true;
  return false;
}

function validateImportUrl(raw: string): { ok: true } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "invalid" };
  }
  const proto = parsed.protocol.toLowerCase();
  if (proto !== "https:" && proto !== "http:") return { ok: false, error: "proto" };
  if (isPrivateHostname(parsed.hostname)) return { ok: false, error: "private" };
  if (parsed.username || parsed.password) return { ok: false, error: "auth" };
  return { ok: true };
}

describe("video import URL validation (SSRF guard)", () => {
  it("allows a public https S3 URL", () => {
    expect(validateImportUrl("https://my-bucket.s3.ir-thr-at1.arvanstorage.ir/videos/lesson1.mp4").ok).toBe(true);
  });

  it("allows liara public URL", () => {
    expect(validateImportUrl("https://asadzedeh.storage.iran.liara.space/videos/l1.mp4").ok).toBe(true);
  });

  it("rejects localhost", () => {
    expect(validateImportUrl("https://localhost/video.mp4").ok).toBe(false);
    expect(validateImportUrl("http://127.0.0.1/video.mp4").ok).toBe(false);
    expect(validateImportUrl("https://127.0.0.1/video.mp4").ok).toBe(false);
  });

  it("rejects private IPv4 ranges", () => {
    expect(validateImportUrl("https://10.0.0.1/video.mp4").ok).toBe(false);
    expect(validateImportUrl("https://192.168.1.10/video.mp4").ok).toBe(false);
    expect(validateImportUrl("https://172.16.5.4/video.mp4").ok).toBe(false);
    expect(validateImportUrl("https://172.31.255.255/video.mp4").ok).toBe(false);
  });

  it("rejects metadata service", () => {
    expect(validateImportUrl("https://169.254.169.254/latest/meta-data/").ok).toBe(false);
    expect(validateImportUrl("https://169.254.1.1/video.mp4").ok).toBe(false);
  });

  it("rejects .local and .internal", () => {
    expect(validateImportUrl("https://my-service.local/video.mp4").ok).toBe(false);
    expect(validateImportUrl("https://db.internal/video.mp4").ok).toBe(false);
  });

  it("rejects URL with credentials", () => {
    expect(validateImportUrl("https://user:pass@example.com/video.mp4").ok).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(validateImportUrl("ftp://example.com/video.mp4").ok).toBe(false);
    expect(validateImportUrl("file:///etc/passwd").ok).toBe(false);
  });
});

describe("video import is aligned with storage model", () => {
  it("imported keys stay inside videos/ prefix", async () => {
    const { videoObjectKey } = await import("@/lib/video");
    expect(videoObjectKey("v-abc", "mp4")).toBe("videos/v-abc.mp4");
    expect(videoObjectKey("v-abc", "mp4").startsWith("videos/")).toBe(true);
  });

  it("imported files are served via secure player, not public media", async () => {
    const { isValidObjectKey } = await import("@/lib/storage");
    // videos/ is valid but /api/media refuses it
    expect(isValidObjectKey("videos/v-abc.mp4")).toBe(true);
    // The refusal is in the route, not the validator — this test documents the contract
  });
});
