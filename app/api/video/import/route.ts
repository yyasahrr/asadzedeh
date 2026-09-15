import path from "node:path";
import { can, getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { faToday } from "@/lib/format";
import { getInstructorByUser, getVideos, writeDb } from "@/lib/store";
import { logger } from "@/lib/logger";
import { storageDurable } from "@/lib/storage";
import { isProduction } from "@/lib/env";
import {
  MAX_VIDEO_BYTES,
  VIDEO_MIME,
  beginUpload,
  finishUpload,
  isVideoExtension,
  newVideoId,
  putChunk,
  videoObjectKey,
  type PendingUpload,
} from "@/lib/video";
import type { VideoAsset } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function authorize() {
  const user = await getSessionUser();
  if (!user) return null;
  if (can(user, "videos") || can(user, "courses")) return user;
  if (user.role === "instructor" && getInstructorByUser(user.id)) return user;
  return null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/**
 * SSRF protection for server-side video import.
 * Only https URLs (http allowed in dev for local testing) pointing to public hosts.
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
  if (a === 169 && b === 254) return true; // link-local + metadata
  return false;
}

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h === "127.0.0.1") return true;
  if (h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "169.254.169.254") return true;
  if (h.startsWith("169.254.")) return true;
  // IPv4 literal
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return isPrivateIPv4(h);
  // IPv6 loopback / private - simple checks
  if (h === "::1" || h === "::ffff:127.0.0.1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:")) return true;
  if (h.includes(":") && (h === "::" || h.startsWith("::ffff:"))) {
    // be conservative: any IPv6 literal without public check -> block if it looks private
    // allow only if it doesn't match private patterns above; otherwise block by default for safety
    // Here we block fc00::/7 and fe80::/10 already handled; rest we allow but fetch will fail if unreachable
  }
  return false;
}

function validateImportUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "آدرس لینک نامعتبر است" };
  }
  const proto = parsed.protocol.toLowerCase();
  const isDev = !isProduction();
  if (proto !== "https:" && !(isDev && proto === "http:")) {
    return { ok: false, error: "فقط لینک‌های https مجاز هستند" };
  }
  if (isPrivateHostname(parsed.hostname)) {
    return { ok: false, error: "آدرس مقصد مجاز نیست (شبکه خصوصی یا لوکال)" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "لینک نباید شامل نام کاربری/رمز باشد" };
  }
  // Block non-standard ports that often expose internal services
  if (parsed.port) {
    const port = Number(parsed.port);
    if (![80, 443].includes(port) && (port < 1024 || port === 3000 || port === 3001 || port === 8000 || port === 8080 || port === 9000)) {
      // allow 80/443, block other privileged and common dev ports unless it's a public CDN port
      // For object storage providers, 443 is standard; 80 rarely but allowed in dev
      if (!(isDev && port === 80)) {
        // still allow high ports >1024 that are not the blocked list
        if ([3000, 3001, 8000, 8080, 9000, 9200, 6379, 5432, 3306].includes(port)) {
          return { ok: false, error: "پورت مقصد مجاز نیست" };
        }
      }
    }
  }
  return { ok: true, url: parsed };
}

async function fetchWithRedirects(initialUrl: URL): Promise<Response> {
  let current = initialUrl;
  for (let i = 0; i < 4; i++) {
    const v = validateImportUrl(current.toString());
    if (!v.ok) throw new Error(v.error);
    const res = await fetch(current.toString(), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      const next = new URL(loc, current);
      current = next;
      continue;
    }
    return res;
  }
  throw new Error("تعداد ریدایرکت‌ها بیش از حد مجاز است");
}

function extFromUrlOrType(url: URL, contentType: string | null): { ext: string; mime: string } {
  const fromPath = path.extname(url.pathname).toLowerCase().replace(".", "");
  let ext = fromPath;
  let mime = contentType?.split(";")[0].trim().toLowerCase() ?? "";

  const mimeMap: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "video/x-matroska": "mkv",
    "video/x-msvideo": "avi",
    "video/mpeg": "mp4",
    "application/octet-stream": "",
    "binary/octet-stream": "",
  };

  if (mime && mimeMap[mime] !== undefined && mimeMap[mime] !== "") {
    ext = mimeMap[mime] || ext;
  } else if (mime && VIDEO_MIME.includes(mime)) {
    // derive from mime
    if (mime.includes("mp4")) ext = "mp4";
    else if (mime.includes("webm")) ext = "webm";
    else if (mime.includes("quicktime")) ext = "mov";
    else if (mime.includes("matroska") || mime.includes("mkv")) ext = "mkv";
  }

  if (!ext) ext = "mp4";
  ext = ext.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!isVideoExtension(ext)) ext = "mp4";

  if (!mime || !VIDEO_MIME.includes(mime)) {
    mime = "video/mp4";
  }

  return { ext, mime };
}

export async function POST(req: Request) {
  const user = await authorize();
  if (!user) return json({ error: "دسترسی ندارید" }, 403);

  if (isProduction() && !storageDurable()) {
    logger.error({ event: "video.import.noObjectStorage" });
    return json(
      {
        error:
          "فضای ذخیره‌سازی ابری پیکربندی نشده است؛ در Production ویدیو باید روی Object Storage ذخیره شود (S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY).",
      },
      503,
    );
  }

  const body = (await req.json().catch(() => ({}))) as { url?: string; title?: string };
  const rawUrl = String(body.url ?? "").trim();
  const titleInput = String(body.title ?? "").trim();

  if (!rawUrl) return json({ error: "لینک ویدیو الزامی است" }, 400);

  const validated = validateImportUrl(rawUrl);
  if (!validated.ok) return json({ error: validated.error }, 400);

  let response: Response;
  try {
    response = await fetchWithRedirects(validated.url);
  } catch (e) {
    logger.error({ event: "video.import.fetch.failed", url: rawUrl, err: String(e) });
    return json({ error: e instanceof Error ? e.message : "دریافت فایل از لینک ناموفق بود" }, 502);
  }

  if (!response.ok) {
    return json({ error: `منبع پاسخ ${response.status} داد` }, 502);
  }

  const contentTypeHeader = response.headers.get("content-type");
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;

  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_BYTES) {
    return json({ error: "حجم فایل بیش از ۴ گیگابایت است" }, 400);
  }

  // Basic content-type check: allow video/* or octet-stream, but also allow if URL looks like video
  if (contentTypeHeader) {
    const ct = contentTypeHeader.split(";")[0].trim().toLowerCase();
    const isVideo = ct.startsWith("video/") || ct === "application/octet-stream" || ct === "binary/octet-stream";
    if (!isVideo) {
      // still allow if extension is video-like, but warn
      const ext = path.extname(validated.url.pathname).toLowerCase();
      if (![".mp4", ".mov", ".webm", ".mkv", ".m4v", ".avi"].includes(ext)) {
        return json({ error: `فرمت منبع پشتیبانی نمی‌شود (${ct})` }, 400);
      }
    }
  }

  const { ext, mime } = extFromUrlOrType(validated.url, contentTypeHeader);
  const id = newVideoId();
  const key = videoObjectKey(id, ext);

  // Estimate total parts
  const estimatedTotal = Number.isFinite(contentLength) && contentLength > 0 ? Math.ceil(contentLength / (8 * 1024 * 1024)) : 1;

  let pending: PendingUpload;
  try {
    pending = await beginUpload({ id, ext, contentType: mime, total: estimatedTotal });
  } catch (error) {
    logger.error({ event: "video.import.init.failed", id, err: String(error) });
    return json({ error: "شروع ذخیره‌سازی ناموفق بود" }, 502);
  }

  const video: VideoAsset = {
    id,
    title: titleInput || validated.url.pathname.split("/").pop()?.replace(/\.[^.]+$/, "") || "ویدیوی واردشده",
    originalName: validated.url.pathname.split("/").pop() || "video.mp4",
    file: key,
    sizeBytes: Number.isFinite(contentLength) ? contentLength : 0,
    mime,
    status: "uploading",
    uploadedBy: user.id,
    createdAt: faToday(),
    chunks: { received: 0, total: estimatedTotal },
    upload: pending,
  };
  writeDb({ videos: [video, ...getVideos()] });

  // Stream download -> multipart upload
  const CHUNK = 8 * 1024 * 1024;
  let buffer = Buffer.alloc(0);
  let partNumber = 1;
  let totalBytes = 0;
  let currentPending = pending;

  try {
    if (!response.body) throw new Error("بدنه پاسخ خالی است");

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const chunk = Buffer.from(value);
      totalBytes += chunk.length;
      if (totalBytes > MAX_VIDEO_BYTES) {
        throw new Error("حجم فایل بیش از حد مجاز (۴GB)");
      }
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= CHUNK) {
        const toUpload = buffer.slice(0, CHUNK);
        buffer = buffer.slice(CHUNK);
        currentPending = await putChunk(currentPending, partNumber - 1, toUpload);
        // persist progress
        writeDb({
          videos: getVideos().map((v) =>
            v.id === id
              ? {
                  ...v,
                  sizeBytes: totalBytes,
                  chunks: { received: currentPending.parts.length, total: Math.max(currentPending.total, currentPending.parts.length) },
                  upload: currentPending,
                }
              : v,
          ),
        });
        partNumber++;
      }
    }

    if (buffer.length > 0) {
      currentPending = await putChunk(currentPending, partNumber - 1, buffer);
      writeDb({
        videos: getVideos().map((v) =>
          v.id === id
            ? {
                ...v,
                sizeBytes: totalBytes,
                chunks: { received: currentPending.parts.length, total: currentPending.parts.length },
                upload: { ...currentPending, total: currentPending.parts.length },
              }
            : v,
        ),
      });
      partNumber++;
    }

    const actualTotal = currentPending.parts.length;
    if (actualTotal === 0) throw new Error("فایلی دریافت نشد");

    // Adjust total to actual
    const finalPending: PendingUpload = { ...currentPending, total: actualTotal };

    await finishUpload(finalPending, totalBytes);

    const finished: VideoAsset = {
      ...video,
      title: titleInput || video.title,
      sizeBytes: totalBytes,
      status: "ready",
      upload: undefined,
      chunks: { received: actualTotal, total: actualTotal },
    };
    writeDb({ videos: getVideos().map((v) => (v.id === id ? finished : v)) });

    await audit({
      action: "video.import",
      actor: { id: user.id, name: user.name, role: user.role },
      target: `video:${id}`,
      detail: { title: finished.title, size: totalBytes, sourceUrl: validated.url.toString(), storage: key },
    });

    return json({ video: finished });
  } catch (error) {
    logger.error({ event: "video.import.failed", id, err: String(error) });
    // cleanup
    try {
      const { abortMultipart } = await import("@/lib/storage");
      await abortMultipart({ key, uploadId: currentPending.uploadId });
    } catch {}
    writeDb({
      videos: getVideos().map((v) => (v.id === id ? { ...v, status: "failed", note: error instanceof Error ? error.message : "واردسازی ناموفق بود", upload: undefined } : v)),
    });
    return json({ error: error instanceof Error ? error.message : "واردسازی ویدیو ناموفق بود" }, 502);
  }
}
