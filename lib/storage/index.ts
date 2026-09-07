import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getEnv, objectStorageConfigured } from "@/lib/env";
import { StorageError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type StorageKind = "local" | "s3";

export interface StoredObject {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

const LOCAL_ROOT = path.join(process.cwd(), "data", "object-store");

function safeKey(key: string): string {
  const cleaned = key.replace(/\\/g, "/").replace(/\.\./g, "").replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("..")) throw new StorageError("کلید فایل نامعتبر است");
  return cleaned;
}

async function hmacSha256(key: Buffer | string, value: string): Promise<Buffer> {
  return crypto.createHmac("sha256", key).update(value).digest();
}

async function sha256Hex(value: Buffer | string): Promise<string> {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function s3ObjectUrl(key: string): string {
  const env = getEnv();
  const endpoint = env.S3_ENDPOINT!.replace(/\/$/, "");
  const bucket = env.S3_BUCKET!;
  const pathStyle = env.S3_FORCE_PATH_STYLE !== "false";
  return pathStyle ? `${endpoint}/${bucket}/${key}` : `${endpoint.replace("://", `://${bucket}.`)}/${key}`;
}

/** Minimal AWS Signature V4 request for S3-compatible providers (Liara, Arvan, MinIO, AWS). */
async function s3Request(
  method: "PUT" | "DELETE",
  key: string,
  body: Buffer,
  contentType?: string,
): Promise<Response> {
  const env = getEnv();
  const region = env.S3_REGION || "us-east-1";
  const access = env.S3_ACCESS_KEY!;
  const secret = env.S3_SECRET_KEY!;
  const url = s3ObjectUrl(key);
  const parsed = new URL(url);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);
  const canonicalHeaders = `host:${parsed.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonical = `${method}\n${parsed.pathname}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256Hex(canonical)}`;
  const kDate = await hmacSha256(`AWS4${secret}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, "s3");
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers: Record<string, string> = {
    Authorization: authorization,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Host: parsed.host,
  };
  if (contentType) headers["Content-Type"] = contentType;

  return fetch(url, {
    method,
    headers,
    body: method === "PUT" ? new Uint8Array(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
}

async function s3Put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
  const res = await s3Request("PUT", key, body, contentType);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ event: "storage.s3.put.failed", status: res.status, detail: text.slice(0, 200) });
    throw new StorageError("آپلود به فضای ابری ناموفق بود");
  }
  const env = getEnv();
  const url = s3ObjectUrl(key);
  const publicBase = env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "") || url.replace(/\/[^/]+$/, "");
  return { key, url: env.S3_PUBLIC_BASE_URL ? `${publicBase}/${key}` : url, size: body.length, contentType };
}

async function s3Delete(key: string): Promise<void> {
  const res = await s3Request("DELETE", key, Buffer.alloc(0));
  // S3 answers 204 for a key that never existed, so only 4xx/5xx are failures.
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    logger.error({ event: "storage.s3.delete.failed", status: res.status, detail: text.slice(0, 200) });
    throw new StorageError("حذف از فضای ابری ناموفق بود");
  }
}

function localPut(key: string, body: Buffer, contentType: string): StoredObject {
  const abs = path.resolve(LOCAL_ROOT, key);
  if (!abs.startsWith(path.resolve(LOCAL_ROOT))) throw new StorageError("path traversal");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
  return { key, url: `/api/media/${key}`, size: body.length, contentType };
}

export function storageKind(): StorageKind {
  return objectStorageConfigured() ? "s3" : "local";
}

export function storageStatus(): { kind: StorageKind; configured: boolean } {
  return { kind: storageKind(), configured: objectStorageConfigured() };
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
  const safe = safeKey(key);
  if (storageKind() === "s3") return s3Put(safe, body, contentType);
  return localPut(safe, body, contentType);
}

/**
 * Remove an object. Used both by the media manager and to roll back an upload
 * whose follow-up steps failed, so a failed request never leaves an orphan.
 */
export async function deleteObject(key: string): Promise<void> {
  const safe = safeKey(key);
  if (storageKind() === "s3") {
    await s3Delete(safe);
    return;
  }
  const abs = localObjectPath(safe);
  if (!abs) throw new StorageError("path traversal");
  await fs.promises.unlink(abs).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

/** Image extensions the app is willing to store. Anything else is rejected. */
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif", "svg"]);

/**
 * Derive a safe extension from the declared MIME type rather than the client
 * filename. A file called `invoice.html` uploaded as `image/png` must not be
 * stored with an `.html` extension the web server would then execute or serve
 * as HTML.
 */
export function extensionForContentType(contentType: string, filename?: string): string | null {
  const fromMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  const fromType = fromMime[contentType.toLowerCase().split(";")[0].trim()];
  if (fromType) return fromType;
  const fromName = (filename?.split(".").pop() || "").toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.has(fromName) ? fromName : null;
}

export function randomObjectKey(prefix: string, ext: string): string {
  const cleanExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `${prefix}/${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}.${cleanExt}`;
}

export function localObjectPath(key: string): string | null {
  const safe = safeKey(key);
  const abs = path.resolve(LOCAL_ROOT, safe);
  if (!abs.startsWith(path.resolve(LOCAL_ROOT) + path.sep) && abs !== path.resolve(LOCAL_ROOT)) return null;
  return abs;
}
