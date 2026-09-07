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

/** Minimal AWS Signature V4 PUT for S3-compatible providers (Liara, Arvan, MinIO, AWS). */
async function s3Put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
  const env = getEnv();
  const endpoint = env.S3_ENDPOINT!.replace(/\/$/, "");
  const region = env.S3_REGION || "us-east-1";
  const bucket = env.S3_BUCKET!;
  const access = env.S3_ACCESS_KEY!;
  const secret = env.S3_SECRET_KEY!;
  const pathStyle = env.S3_FORCE_PATH_STYLE !== "false";
  const url = pathStyle ? `${endpoint}/${bucket}/${key}` : `${endpoint.replace("://", `://${bucket}.`)}/${key}`;
  const parsed = new URL(url);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);
  const canonicalHeaders = `host:${parsed.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonical = `PUT\n${parsed.pathname}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256Hex(canonical)}`;
  const kDate = await hmacSha256(`AWS4${secret}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, "s3");
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Host: parsed.host,
    },
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ event: "storage.s3.put.failed", status: res.status, detail: text.slice(0, 200) });
    throw new StorageError("آپلود به فضای ابری ناموفق بود");
  }
  const publicBase = env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "") || url.replace(/\/[^/]+$/, "");
  return { key, url: env.S3_PUBLIC_BASE_URL ? `${publicBase}/${key}` : url, size: body.length, contentType };
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
