import path from "node:path";
import { can, getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { faToday } from "@/lib/format";
import { getInstructorByUser, getVideo, getVideos, writeDb } from "@/lib/store";
import { logger } from "@/lib/logger";
import { storageDurable } from "@/lib/storage";
import { isProduction } from "@/lib/env";
import {
  CHUNK_SIZE,
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

/**
 * Chunked video upload into private object storage.
 *
 *   POST ?action=init    { size, type, title, name }   -> { uploadId, chunkSize, total }
 *   POST ?action=chunk&uploadId=…&index=N  (raw bytes) -> { ok }
 *   POST ?action=finish  { uploadId, total, … }        -> { video }
 *
 * Each chunk becomes one object-storage part, so a 4 GB course video is never
 * held in memory and never touches the container's disk. The part list is
 * persisted on the video record, which means an upload interrupted by a deploy
 * is resumable and, if abandoned, reaped by `reapStaleUploads` instead of
 * quietly billing for orphaned parts.
 *
 * Staff with the "videos" permission and instructors can upload.
 */

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

const UPLOAD_ID_RE = /^v-[a-z0-9-]+$/i;

/** Read the pending upload off the video record, or null if it is not there. */
function pendingOf(id: string): { video: VideoAsset; pending: PendingUpload } | null {
  const video = getVideo(id);
  const upload = video?.upload;
  if (!video || !upload) return null;
  return { video, pending: upload as PendingUpload };
}

function savePending(id: string, pending: PendingUpload, patch: Partial<VideoAsset> = {}) {
  writeDb({
    videos: getVideos().map((v) =>
      v.id === id
        ? {
            ...v,
            ...patch,
            chunks: { received: pending.parts.length, total: pending.total },
            upload: pending,
          }
        : v,
    ),
  });
}

export async function POST(req: Request) {
  const user = await authorize();
  if (!user) return json({ error: "دسترسی ندارید" }, 403);
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "init") {
    const body = (await req.json().catch(() => ({}))) as { name?: string; size?: number; type?: string; title?: string };
    const size = Number(body.size ?? 0);
    const type = String(body.type ?? "");
    const ext = path.extname(String(body.name ?? "")).toLowerCase().replace(".", "");

    if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO_BYTES) {
      return json({ error: "حجم فایل مجاز نیست (حداکثر ۴ گیگابایت)" }, 400);
    }
    if (!VIDEO_MIME.includes(type) && !isVideoExtension(ext)) {
      return json({ error: "فرمت ویدیو پشتیبانی نمی‌شود (mp4, mov, webm, mkv)" }, 400);
    }

    // A PaaS container disk is wiped on every deploy. Uploading a course video
    // into local storage would mean losing the product the next time the app
    // restarts, so production refuses rather than accepting bytes it cannot keep.
    if (isProduction() && !storageDurable()) {
      logger.error({ event: "video.upload.noObjectStorage" });
      return json(
        {
          error:
            "فضای ذخیره‌سازی ابری پیکربندی نشده است؛ در Production ویدیو باید روی Object Storage ذخیره شود (S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY).",
        },
        503,
      );
    }

    const id = newVideoId();
    const safeExt = isVideoExtension(ext) ? ext : "mp4";
    const contentType = VIDEO_MIME.includes(type) ? type : "video/mp4";
    const total = Math.ceil(size / CHUNK_SIZE);

    let pending: PendingUpload;
    try {
      pending = await beginUpload({ id, ext: safeExt, contentType, total });
    } catch (error) {
      logger.error({ event: "video.upload.init.failed", id, err: String(error) });
      return json({ error: "شروع آپلود ناموفق بود" }, 502);
    }

    // The record exists from the first moment, so a crash mid-upload leaves
    // something findable rather than an anonymous multipart upload in the bucket.
    const video: VideoAsset = {
      id,
      title: String(body.title ?? "").trim() || String(body.name ?? "ویدیو").replace(/\.[^.]+$/, ""),
      originalName: String(body.name ?? "video"),
      file: videoObjectKey(id, safeExt),
      sizeBytes: size,
      mime: contentType,
      status: "uploading",
      uploadedBy: user.id,
      createdAt: faToday(),
      chunks: { received: 0, total },
      upload: pending,
    };
    writeDb({ videos: [video, ...getVideos()] });

    return json({ uploadId: id, chunkSize: CHUNK_SIZE, total });
  }

  if (action === "chunk") {
    const uploadId = url.searchParams.get("uploadId") ?? "";
    const index = Number(url.searchParams.get("index"));
    if (!UPLOAD_ID_RE.test(uploadId) || !Number.isInteger(index) || index < 0) {
      return json({ error: "پارامتر نامعتبر" }, 400);
    }

    const found = pendingOf(uploadId);
    if (!found) return json({ error: "آپلود پیدا نشد یا منقضی شده است" }, 404);
    const { video, pending } = found;

    // Only the account that started the upload may add parts to it.
    if (video.uploadedBy !== user.id && !can(user, "videos")) {
      return json({ error: "دسترسی ندارید" }, 403);
    }
    if (index >= pending.total) return json({ error: "شماره قطعه خارج از محدوده است" }, 400);

    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length === 0 || buf.length > CHUNK_SIZE + 1024) {
      return json({ error: "اندازه قطعه نامعتبر" }, 400);
    }

    try {
      const updated = await putChunk(pending, index, buf);
      savePending(uploadId, updated);
      return json({ ok: true, index });
    } catch (error) {
      // The client retries; if every retry fails the upload is reaped later.
      logger.error({ event: "video.upload.chunk.failed", id: uploadId, index, err: String(error) });
      return json({ error: "ذخیره قطعه ناموفق بود" }, 502);
    }
  }

  if (action === "finish") {
    const body = (await req.json().catch(() => ({}))) as { uploadId?: string; total?: number; name?: string; type?: string; title?: string };
    const uploadId = String(body.uploadId ?? "");
    const total = Number(body.total ?? 0);
    const maxChunks = Math.ceil(MAX_VIDEO_BYTES / CHUNK_SIZE);

    if (!UPLOAD_ID_RE.test(uploadId) || !Number.isInteger(total) || total < 1 || total > maxChunks) {
      return json({ error: "پارامتر نامعتبر" }, 400);
    }

    const found = pendingOf(uploadId);
    if (!found) return json({ error: "آپلود پیدا نشد یا منقضی شده است" }, 404);
    const { video, pending } = found;
    if (video.uploadedBy !== user.id && !can(user, "videos")) {
      return json({ error: "دسترسی ندارید" }, 403);
    }

    // Report the first missing chunk so the client can resend it, rather than
    // failing the whole multi-gigabyte upload.
    const missingIndex = (() => {
      for (let i = 0; i < total; i++) {
        if (!pending.parts.some((p) => p.partNumber === i + 1)) return i;
      }
      return -1;
    })();
    if (missingIndex >= 0) {
      return json({ error: `قطعه ${missingIndex + 1} دریافت نشده؛ دوباره تلاش کنید`, missing: missingIndex }, 409);
    }

    try {
      await finishUpload(pending, video.sizeBytes);
    } catch (error) {
      logger.error({ event: "video.upload.finish.failed", id: uploadId, err: String(error) });
      writeDb({
        videos: getVideos().map((v) =>
          v.id === uploadId ? { ...v, status: "failed", note: "نهایی‌سازی آپلود ناموفق بود" } : v,
        ),
      });
      return json({ error: "نهایی‌سازی آپلود ناموفق بود" }, 502);
    }

    const finished: VideoAsset = {
      ...video,
      title: String(body.title ?? "").trim() || video.title,
      originalName: String(body.name ?? video.originalName),
      status: "ready",
      note: undefined,
      upload: undefined,
      chunks: { received: total, total },
    };
    writeDb({ videos: getVideos().map((v) => (v.id === uploadId ? finished : v)) });

    await audit({
      action: "video.upload",
      actor: { id: user.id, name: user.name, role: user.role },
      target: `video:${finished.id}`,
      detail: { title: finished.title, size: finished.sizeBytes, storage: pending.key },
    });

    return json({ video: finished });
  }

  return json({ error: "action نامعتبر" }, 400);
}
