import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getEnv, objectStorageConfigured, s3Credentials } from "@/lib/env";
import { StorageError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Object storage for every byte the app must survive a redeploy.
 *
 * Two backends, one interface:
 *
 *   - `s3`    — any S3-compatible provider (Arvan, Liara, MinIO, AWS), signed
 *               with AWS Signature V4. This is what production uses.
 *   - `local` — `data/object-store` on disk. Development and tests only: a PaaS
 *               container filesystem is wiped on every deploy, so anything the
 *               business needs after a restart cannot live there.
 *
 * Buckets are assumed **private**. Nothing here produces a URL a browser can
 * open on its own: reads are proxied through an app route that authorises the
 * caller first, so no object URL, key or credential ever reaches the client.
 */

export type StorageKind = "local" | "s3";

export interface StoredObject {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

/** Metadata for a stored object, without fetching its bytes. */
export interface ObjectHead {
  size: number;
  contentType: string;
}

/** A readable body plus the framing a range-aware HTTP response needs. */
export interface ObjectRead {
  body: ReadableStream<Uint8Array> | NodeJS.ReadableStream;
  size: number;
  contentType: string;
  /** 206 when a range was served, 200 for the whole object. */
  status: 200 | 206;
  contentRange?: string;
  contentLength?: number;
}

export interface MultipartUpload {
  key: string;
  uploadId: string;
}

export interface UploadedPart {
  partNumber: number;
  etag: string;
}

/**
 * S3 requires every part but the last to be at least this large. Uploads are
 * chunked at this size so one client chunk maps to exactly one part.
 */
export const MIN_PART_BYTES = 8 * 1024 * 1024;

const LOCAL_ROOT = path.join(process.cwd(), "data", "object-store");
const LOCAL_PARTS = path.join(LOCAL_ROOT, ".parts");

function localRoot(): string {
  return path.resolve(LOCAL_ROOT);
}

function safeKey(key: string): string {
  const cleaned = key.replace(/\\/g, "/").replace(/\.\./g, "").replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("..")) throw new StorageError("کلید فایل نامعتبر است");
  return cleaned;
}

/**
 * Reject keys that do not look like an object key the app itself generated.
 * Stricter than `safeKey`: no leading dots, no control characters, no empty
 * segments. Used for anything that came from a request.
 */
export function isValidObjectKey(key: string): boolean {
  if (!/^[a-z0-9][a-z0-9._/-]{0,511}$/i.test(key)) return false;
  if (key.includes("//") || key.endsWith("/")) return false;
  // Reject any `..` segment outright. Stripping it would silently rewrite a
  // traversal attempt into a *different* valid key, which reads as success to
  // the caller and hides the attempt from the log.
  if (key.split("/").some((segment) => segment === ".." || segment === ".")) return false;
  return true;
}

async function hmacSha256(key: Buffer | string, value: string): Promise<Buffer> {
  return crypto.createHmac("sha256", key).update(value).digest();
}

async function sha256Hex(value: Buffer | string): Promise<string> {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Credentials or a thrown StorageError — never a half-configured request. */
function requireS3(): NonNullable<ReturnType<typeof s3Credentials>> {
  const creds = s3Credentials();
  if (!creds) throw new StorageError("فضای ابری پیکربندی نشده است");
  return creds;
}

function s3ObjectUrl(key: string): string {
  const env = getEnv();
  const { endpoint: rawEndpoint, bucket } = requireS3();
  const endpoint = rawEndpoint.replace(/\/$/, "");
  const pathStyle = env.S3_FORCE_PATH_STYLE !== "false";
  return pathStyle ? `${endpoint}/${bucket}/${key}` : `${endpoint.replace("://", `://${bucket}.`)}/${key}`;
}

function encodeQuery(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");
}

interface SignedRequestOptions {
  method: "GET" | "PUT" | "POST" | "DELETE" | "HEAD";
  key: string;
  query?: Record<string, string>;
  body?: Buffer;
  contentType?: string;
  /** Extra headers to sign and send (e.g. Range). */
  headers?: Record<string, string>;
}

/**
 * AWS Signature V4 request for S3-compatible providers.
 *
 * Every header that is sent is also signed, so a proxy cannot silently alter
 * `Range` or `Content-Type` without invalidating the request.
 */
async function s3Fetch(options: SignedRequestOptions): Promise<Response> {
  const env = getEnv();
  const region = env.S3_REGION || "us-east-1";
  const { accessKey: access, secretKey: secret } = requireS3();
  const url = s3ObjectUrl(options.key);
  const parsed = new URL(url);
  const body = options.body ?? Buffer.alloc(0);
  const queryString = options.query ? encodeQuery(options.query) : "";

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);

  const headerMap: Record<string, string> = {
    host: parsed.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(options.contentType ? { "content-type": options.contentType } : {}),
    ...(options.headers
      ? Object.fromEntries(Object.entries(options.headers).map(([k, v]) => [k.toLowerCase(), v]))
      : {}),
  };

  const signedNames = Object.keys(headerMap).sort();
  const canonicalHeaders = signedNames.map((n) => `${n}:${headerMap[n].trim()}\n`).join("");
  const signedHeaders = signedNames.join(";");
  const canonical = [
    options.method,
    parsed.pathname,
    queryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256Hex(canonical)}`;
  const kDate = await hmacSha256(`AWS4${secret}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, "s3");
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const requestHeaders: Record<string, string> = {
    Authorization: `AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  for (const name of signedNames) {
    if (name === "host") continue;
    requestHeaders[name] = headerMap[name];
  }
  if (options.contentType) requestHeaders["Content-Type"] = options.contentType;
  if (options.method === "PUT" || options.method === "POST") {
    requestHeaders["Content-Length"] = String(body.length);
  }

  return fetch(queryString ? `${url}?${queryString}` : url, {
    method: options.method,
    headers: requestHeaders,
    body: options.method === "GET" || options.method === "HEAD" || options.method === "DELETE"
      ? undefined
      : new Uint8Array(body),
    signal: AbortSignal.timeout(60_000),
  });
}

async function s3ErrorText(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  return text.slice(0, 200);
}

/* ------------------------------------------------------------------ writes */

async function s3Put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
  const res = await s3Fetch({ method: "PUT", key, body, contentType });
  if (!res.ok) {
    logger.error({ event: "storage.s3.put.failed", status: res.status, detail: await s3ErrorText(res) });
    throw new StorageError("آپلود به فضای ابری ناموفق بود");
  }
  return { key, url: `/api/media/${key}`, size: body.length, contentType };
}

function localPut(key: string, body: Buffer, contentType: string): StoredObject {
  const abs = path.resolve(LOCAL_ROOT, key);
  if (!abs.startsWith(localRoot())) throw new StorageError("path traversal");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
  return { key, url: `/api/media/${key}`, size: body.length, contentType };
}

/* ----------------------------------------------------------- multipart up */

/**
 * Large files (course videos run to gigabytes) are uploaded in parts so the
 * bytes are never buffered whole in app memory and never need a local staging
 * file. On S3 this is a real multipart upload; locally the parts are staged
 * under `data/object-store/.parts` and concatenated on complete.
 */
async function s3InitiateMultipart(key: string, contentType: string): Promise<string> {
  const res = await s3Fetch({ method: "POST", key, query: { uploads: "" }, contentType });
  if (!res.ok) {
    logger.error({ event: "storage.s3.multipart.init.failed", status: res.status, detail: await s3ErrorText(res) });
    throw new StorageError("شروع آپلود چندبخشی ناموفق بود");
  }
  const xml = await res.text();
  const uploadId = xml.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
  if (!uploadId) throw new StorageError("پاسخ نامعتبر از فضای ابری");
  return uploadId;
}

async function s3UploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
  body: Buffer,
): Promise<string> {
  const res = await s3Fetch({
    method: "PUT",
    key,
    query: { partNumber: String(partNumber), uploadId },
    body,
  });
  if (!res.ok) {
    logger.error({
      event: "storage.s3.multipart.part.failed",
      status: res.status,
      partNumber,
      detail: await s3ErrorText(res),
    });
    throw new StorageError(`آپلود بخش ${partNumber} ناموفق بود`);
  }
  const etag = res.headers.get("etag");
  if (!etag) throw new StorageError("پاسخ فضای ابری ETag نداشت");
  return etag;
}

async function s3CompleteMultipart(
  key: string,
  uploadId: string,
  parts: UploadedPart[],
  contentType: string,
): Promise<void> {
  const xml =
    "<CompleteMultipartUpload>" +
    parts
      .slice()
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`)
      .join("") +
    "</CompleteMultipartUpload>";
  const res = await s3Fetch({
    method: "POST",
    key,
    query: { uploadId },
    body: Buffer.from(xml, "utf-8"),
    contentType: "application/xml",
  });
  if (!res.ok) {
    logger.error({ event: "storage.s3.multipart.complete.failed", status: res.status, detail: await s3ErrorText(res) });
    throw new StorageError("نهایی‌سازی آپلود ناموفق بود");
  }
  void contentType;
}

async function s3AbortMultipart(key: string, uploadId: string): Promise<void> {
  await s3Fetch({ method: "DELETE", key, query: { uploadId } }).catch(() => undefined);
}

function localPartPath(uploadId: string, partNumber: number): string {
  if (!/^[a-z0-9._-]+$/i.test(uploadId)) throw new StorageError("شناسه آپلود نامعتبر است");
  return path.join(LOCAL_PARTS, uploadId, `${partNumber}.part`);
}

async function localInitiateMultipart(key: string): Promise<string> {
  // The uploadId doubles as the staging directory name, so it must be safe to
  // put on a filesystem without further escaping.
  const uploadId = crypto.randomBytes(12).toString("hex");
  fs.mkdirSync(path.join(LOCAL_PARTS, uploadId), { recursive: true });
  fs.writeFileSync(path.join(LOCAL_PARTS, uploadId, ".key"), safeKey(key), "utf-8");
  return uploadId;
}

async function localUploadPart(uploadId: string, partNumber: number, body: Buffer): Promise<string> {
  const abs = localPartPath(uploadId, partNumber);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
  return `"${await sha256Hex(body)}"`;
}

async function localCompleteMultipart(key: string, uploadId: string, parts: UploadedPart[]): Promise<number> {
  const stagedKey = fs.readFileSync(path.join(LOCAL_PARTS, uploadId, ".key"), "utf-8");
  if (stagedKey !== key) throw new StorageError("شناسه آپلود با کلید فایل هم‌خوانی ندارد");
  const abs = path.resolve(LOCAL_ROOT, key);
  if (!abs.startsWith(localRoot())) throw new StorageError("path traversal");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const fd = fs.openSync(abs, "w");
  let size = 0;
  try {
    for (const part of parts.slice().sort((a, b) => a.partNumber - b.partNumber)) {
      const buf = fs.readFileSync(localPartPath(uploadId, part.partNumber));
      fs.writeSync(fd, buf);
      size += buf.length;
    }
  } finally {
    fs.closeSync(fd);
  }
  return size;
}

function localAbortMultipart(uploadId: string): void {
  fs.rmSync(path.join(LOCAL_PARTS, uploadId), { recursive: true, force: true });
}

/* ------------------------------------------------------------------- reads */

async function s3Head(key: string): Promise<ObjectHead | null> {
  const res = await s3Fetch({ method: "HEAD", key });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) {
    logger.error({ event: "storage.s3.head.failed", status: res.status });
    throw new StorageError("خواندن اطلاعات فایل ناموفق بود");
  }
  return {
    size: Number(res.headers.get("content-length") ?? 0),
    contentType: res.headers.get("content-type") || "application/octet-stream",
  };
}

function localHead(key: string): ObjectHead | null {
  const abs = path.resolve(LOCAL_ROOT, key);
  if (!abs.startsWith(localRoot())) throw new StorageError("path traversal");
  try {
    const stat = fs.statSync(abs);
    return { size: stat.size, contentType: contentTypeForKey(key) };
  } catch {
    return null;
  }
}

function contentTypeForKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp4":
    case "m4v":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "mkv":
      return "video/x-matroska";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

/**
 * Read an object, optionally a byte range of it.
 *
 * Range support is what lets a `<video>` element seek: without it the player
 * has to download the whole file before it can jump, and Safari refuses to play
 * progressive MP4 at all.
 */
async function s3Read(key: string, range?: { start: number; end: number }): Promise<ObjectRead | null> {
  const headers = range ? { Range: `bytes=${range.start}-${range.end}` } : undefined;
  const res = await s3Fetch({ method: "GET", key, headers });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok && res.status !== 206) {
    logger.error({ event: "storage.s3.get.failed", status: res.status, detail: await s3ErrorText(res) });
    throw new StorageError("خواندن فایل ناموفق بود");
  }
  if (!res.body) throw new StorageError("فضای ابری بدنه‌ای برنگرداند");
  const contentRange = res.headers.get("content-range") ?? undefined;
  const total = contentRange ? Number(contentRange.split("/")[1]) : Number(res.headers.get("content-length") ?? 0);
  return {
    body: res.body,
    size: total,
    contentType: res.headers.get("content-type") || contentTypeForKey(key),
    status: res.status === 206 ? 206 : 200,
    contentRange,
    contentLength: Number(res.headers.get("content-length") ?? 0) || undefined,
  };
}

function localRead(key: string, range?: { start: number; end: number }): ObjectRead | null {
  const abs = path.resolve(LOCAL_ROOT, key);
  if (!abs.startsWith(localRoot())) throw new StorageError("path traversal");
  let stat: fs.Stats;
  try {
    stat = fs.statSync(abs);
  } catch {
    return null;
  }
  if (range) {
    const stream = fs.createReadStream(abs, { start: range.start, end: range.end });
    // Prevent ENOENT from becoming an unhandled exception when the caller deletes
    // the file before the stream opens (race in tests: openVideo returns a stream,
    // then deleteObject removes the file).
    stream.on("error", () => {});
    return {
      body: stream,
      size: stat.size,
      contentType: contentTypeForKey(key),
      status: 206,
      contentRange: `bytes ${range.start}-${range.end}/${stat.size}`,
      contentLength: range.end - range.start + 1,
    };
  }
  const s = fs.createReadStream(abs);
  s.on("error", () => {});
  return {
    body: s,
    size: stat.size,
    contentType: contentTypeForKey(key),
    status: 200,
    contentLength: stat.size,
  };
}

/* -------------------------------------------------------------- public API */

export function storageKind(): StorageKind {
  return objectStorageConfigured() ? "s3" : "local";
}

export function storageStatus(): { kind: StorageKind; configured: boolean } {
  return { kind: storageKind(), configured: objectStorageConfigured() };
}

/**
 * Whether uploads can survive a redeploy.
 *
 * A PaaS container's filesystem is ephemeral, so in production `local` storage
 * means every uploaded file is lost on the next deploy. Callers use this to
 * warn the operator instead of silently accepting a file that will vanish.
 */
export function storageDurable(): boolean {
  return storageKind() === "s3";
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
    const res = await s3Fetch({ method: "DELETE", key: safe });
    // S3 answers 204 for a key that never existed, so only 4xx/5xx are failures.
    if (!res.ok && res.status !== 404) {
      logger.error({ event: "storage.s3.delete.failed", status: res.status, detail: await s3ErrorText(res) });
      throw new StorageError("حذف از فضای ابری ناموفق بود");
    }
    return;
  }
  const abs = localObjectPath(safe);
  if (!abs) throw new StorageError("path traversal");
  await fs.promises.unlink(abs).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

export async function headObject(key: string): Promise<ObjectHead | null> {
  const safe = safeKey(key);
  if (storageKind() === "s3") return s3Head(safe);
  return localHead(safe);
}

export async function readObject(key: string, range?: { start: number; end: number }): Promise<ObjectRead | null> {
  const safe = safeKey(key);
  if (storageKind() === "s3") return s3Read(safe, range);
  return localRead(safe, range);
}

export async function objectExists(key: string): Promise<boolean> {
  return (await headObject(key)) !== null;
}

export async function initiateMultipart(key: string, contentType: string): Promise<MultipartUpload> {
  const safe = safeKey(key);
  const uploadId =
    storageKind() === "s3" ? await s3InitiateMultipart(safe, contentType) : await localInitiateMultipart(safe);
  return { key: safe, uploadId };
}

export async function uploadPart(
  upload: MultipartUpload,
  partNumber: number,
  body: Buffer,
): Promise<UploadedPart> {
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000) {
    throw new StorageError("شماره بخش نامعتبر است");
  }
  const etag =
    storageKind() === "s3"
      ? await s3UploadPart(upload.key, upload.uploadId, partNumber, body)
      : await localUploadPart(upload.uploadId, partNumber, body);
  return { partNumber, etag };
}

export async function completeMultipart(
  upload: MultipartUpload,
  parts: UploadedPart[],
  contentType: string,
): Promise<StoredObject> {
  if (parts.length === 0) throw new StorageError("هیچ بخشی آپلود نشده است");
  const seen = new Set<number>();
  for (const part of parts) {
    if (seen.has(part.partNumber)) throw new StorageError("شماره بخش تکراری است");
    seen.add(part.partNumber);
  }
  let size = 0;
  if (storageKind() === "s3") {
    await s3CompleteMultipart(upload.key, upload.uploadId, parts, contentType);
    const head = await s3Head(upload.key);
    size = head?.size ?? 0;
  } else {
    size = await localCompleteMultipart(upload.key, upload.uploadId, parts);
    localAbortMultipart(upload.uploadId);
  }
  return { key: upload.key, url: `/api/media/${upload.key}`, size, contentType };
}

/**
 * Best-effort cancel. Never throws: this runs on the failure path, and an
 * unreachable provider must not mask the original error.
 */
export async function abortMultipart(upload: MultipartUpload): Promise<void> {
  try {
    if (storageKind() === "s3") await s3AbortMultipart(upload.key, upload.uploadId);
    else localAbortMultipart(upload.uploadId);
  } catch (error) {
    logger.warn({ event: "storage.multipart.abort.failed", err: String(error) });
  }
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
  if (!abs.startsWith(localRoot() + path.sep) && abs !== localRoot()) return null;
  return abs;
}
