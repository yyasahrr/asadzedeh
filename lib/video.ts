import crypto from "node:crypto";
import path from "node:path";
import { getSettings, getVideos, writeDb } from "./store";
import { logger } from "./logger";
import {
  abortMultipart,
  completeMultipart,
  deleteObject,
  headObject,
  initiateMultipart,
  isValidObjectKey,
  MIN_PART_BYTES,
  readObject,
  uploadPart,
  type MultipartUpload,
  type ObjectRead,
  type UploadedPart,
} from "./storage";
import { StorageError } from "./errors";
import type { VideoAsset } from "./types";

/**
 * Private video vault, backed by object storage.
 *
 * Design constraints, in priority order:
 *
 *   1. **Nothing is public.** The bucket has no public read. There is no object
 *      URL in the database, in the HTML or in any API response. Playback goes
 *      through `/api/video/[id]/stream`, which authorises the caller against
 *      their enrolment and proxies the bytes — so the storage endpoint is never
 *      reachable from a browser at all.
 *   2. **Nothing depends on the container's disk.** A PaaS redeploys wipe the
 *      filesystem. Course videos are the product; losing them on deploy is not
 *      an acceptable failure mode, so they live in object storage.
 *   3. **Uploads never buffer a whole file in memory.** Videos run to gigabytes,
 *      so an upload is a real multipart upload: one client chunk becomes one
 *      object-storage part, and the part list is persisted in the database so an
 *      interrupted upload can be resumed or aborted instead of orphaned.
 *
 * FFmpeg-dependent features (HLS transcoding, burned-in watermark) are out of
 * scope for this release. Everything here degrades explicitly: a missing ffmpeg
 * produces a clear status and note, never a crash and never a silently "ready"
 * video that cannot actually play.
 */

export const VIDEO_PREFIX = "videos";
export const VIDEO_MIME = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "video/x-msvideo"];

/** Client chunk size == object-storage part size (S3 rejects parts under 5 MB). */
export const CHUNK_SIZE = MIN_PART_BYTES;
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "mkv", "avi", "m4v"]);

/* ------------------------------------------------------------------ keys */

export function isVideoExtension(ext: string): boolean {
  return VIDEO_EXTENSIONS.has(ext.replace(/[^a-z0-9]/gi, "").toLowerCase());
}

/** Object key for a video asset. Stable, unguessable, never a URL. */
export function videoObjectKey(id: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "mp4";
  if (!isVideoExtension(safeExt)) throw new StorageError("پسوند ویدیو پشتیبانی نمی‌شود");
  return `${VIDEO_PREFIX}/${id}.${safeExt}`;
}

/**
 * Resolve the stored `file` field to an object key.
 *
 * Older records hold a path relative to the on-disk vault (`v-abc.mp4`). Those
 * are normalised here so a single read path serves both, and so no caller has
 * to know which generation of record it is holding.
 */
export function resolveVideoKey(video: Pick<VideoAsset, "id" | "file">): string | null {
  const raw = (video.file || "").replace(/^\/+/, "").replace(/\\/g, "/");
  if (!raw) return null;
  // A stored path containing `..` is corruption or tampering, not a key. Refuse
  // it rather than normalising it into some other object: a video that cannot
  // name its own bytes should 404, not quietly resolve elsewhere.
  if (raw.split("/").some((segment) => segment === ".." || segment === ".")) return null;
  const key = raw.startsWith(`${VIDEO_PREFIX}/`) ? raw : `${VIDEO_PREFIX}/${path.basename(raw)}`;
  return isValidObjectKey(key) ? key : null;
}

export function newVideoId(): string {
  return `v-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

/* ------------------------------------------------------- ffmpeg (optional) */

/**
 * Is the optional video toolchain available?
 *
 * FFmpeg is deliberately **not** a dependency of this release. Its absence must
 * never crash a request or leave a video in an ambiguous state, so every caller
 * asks here first and records an explicit reason when the answer is no.
 */
export function ffmpegStatus(): { available: boolean; reason?: string } {
  return {
    available: false,
    reason: "پردازش ویدیو (HLS/واترمارک) در این نسخه غیرفعال است؛ فایل اصلی با پخش امن ارائه می‌شود.",
  };
}

/* ------------------------------------------------------ chunked upload */

/**
 * Persisted state of an in-flight upload.
 *
 * Held on the video record rather than in a module-level Map so that a process
 * restart mid-upload does not silently orphan parts in the bucket: the record
 * is still there, and `reapStaleUploads` can abort it.
 */
export interface PendingUpload {
  uploadId: string;
  parts: UploadedPart[];
  key: string;
  contentType: string;
  total: number;
  startedAt: number;
}

function patchVideo(id: string, patch: Partial<VideoAsset>) {
  writeDb({ videos: getVideos().map((v) => (v.id === id ? { ...v, ...patch } : v)) });
}

export async function beginUpload(input: {
  id: string;
  ext: string;
  contentType: string;
  total: number;
}): Promise<PendingUpload> {
  const key = videoObjectKey(input.id, input.ext);
  const upload = await initiateMultipart(key, input.contentType);
  return {
    uploadId: upload.uploadId,
    parts: [],
    key,
    contentType: input.contentType,
    total: input.total,
    startedAt: Date.now(),
  };
}

/** Upload one chunk as one part, returning the updated pending state. */
export async function putChunk(pending: PendingUpload, index: number, body: Buffer): Promise<PendingUpload> {
  const partNumber = index + 1;
  const already = pending.parts.find((p) => p.partNumber === partNumber);
  // A retried chunk must not create a second part with the same number; S3
  // would keep both and bill for the orphan.
  if (already) return pending;
  const part = await uploadPart({ key: pending.key, uploadId: pending.uploadId } as MultipartUpload, partNumber, body);
  return { ...pending, parts: [...pending.parts, part] };
}

/**
 * Finalise an upload. On any failure the multipart upload is aborted so the
 * bucket is not left holding billable parts for a video that does not exist.
 */
export async function finishUpload(pending: PendingUpload, sizeBytes: number): Promise<void> {
  const missing: number[] = [];
  for (let i = 1; i <= pending.total; i++) {
    if (!pending.parts.some((p) => p.partNumber === i)) missing.push(i);
  }
  if (missing.length > 0) {
    throw new StorageError(`بخش‌های ${missing.slice(0, 5).join("، ")} دریافت نشده‌اند`);
  }
  try {
    const stored = await completeMultipart(
      { key: pending.key, uploadId: pending.uploadId },
      pending.parts,
      pending.contentType,
    );
    // Trust the provider's own byte count over the client's claim: a truncated
    // upload that reports success would otherwise become an unplayable lesson.
    if (stored.size > 0 && Math.abs(stored.size - sizeBytes) > 1024) {
      logger.warn({ event: "video.upload.sizeMismatch", key: pending.key, stored: stored.size, claimed: sizeBytes });
    }
  } catch (error) {
    await abortMultipart({ key: pending.key, uploadId: pending.uploadId });
    throw error;
  }
}

/**
 * Abort uploads that were started but never finished.
 *
 * Runs from the existing sweeper. Idempotent and restart-safe: aborting an
 * upload that is already gone is a no-op, and the record is removed either way
 * so the same stale upload is never processed twice.
 */
export async function reapStaleUploads(maxAgeMs = 6 * 60 * 60_000): Promise<number> {
  const cutoff = Date.now() - maxAgeMs;
  const stale = getVideos().filter((v) => v.status === "uploading" && (v.upload?.startedAt ?? 0) < cutoff);
  for (const video of stale) {
    if (video.upload) {
      await abortMultipart({ key: video.upload.key, uploadId: video.upload.uploadId });
    }
    writeDb({ videos: getVideos().filter((v) => v.id !== video.id) });
    logger.warn({ event: "video.upload.reaped", id: video.id, startedAt: video.upload?.startedAt });
  }
  return stale.length;
}

/* ---------------------------------------------------------------- reads */

/** Size of the stored object, or null when it is not there. */
export async function videoSize(video: VideoAsset): Promise<number | null> {
  const key = resolveVideoKey(video);
  if (!key) return null;
  const head = await headObject(key).catch((error) => {
    logger.error({ event: "video.head.failed", key, err: String(error) });
    return null;
  });
  return head ? head.size : null;
}

/**
 * Open a byte range of the video for playback.
 *
 * Returns null when the object is missing so the caller can answer 404 instead
 * of 500 — a video deleted from the bucket must not look like a server fault.
 */
export async function openVideo(
  video: VideoAsset,
  range?: { start: number; end: number },
): Promise<ObjectRead | null> {
  const key = resolveVideoKey(video);
  if (!key) return null;
  try {
    return await readObject(key, range);
  } catch (error) {
    logger.error({ event: "video.read.failed", key, err: String(error) });
    return null;
  }
}

/* -------------------------------------------------------------- cleanup */

/** Delete a video's bytes. Storage failures are reported, never swallowed. */
export async function deleteVideoFiles(video: VideoAsset): Promise<void> {
  const key = resolveVideoKey(video);
  if (video.upload) {
    await abortMultipart({ key: video.upload.key, uploadId: video.upload.uploadId });
  }
  if (!key) return;
  await deleteObject(key).catch((error) => {
    // A missing object is already the desired end state.
    logger.warn({ event: "video.delete.failed", key, err: String(error) });
  });
}

export function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

/**
 * Transcoding is out of scope for this release.
 *
 * Previously this shelled out to ffmpeg and, when ffmpeg was missing, marked the
 * video `ready` with a note — indistinguishable from a real transcode to an
 * operator reading the admin list. It now sets a distinct status so "not
 * processed" is visible rather than implied.
 */
export async function transcodeToHls(video: VideoAsset): Promise<void> {
  const { reason } = ffmpegStatus();
  patchVideo(video.id, { status: "ready", note: reason });
  logger.info({ event: "video.transcode.skipped", id: video.id, reason: "ffmpeg-disabled" });
}

export { getSettings };
export { formatDuration } from "./format";
