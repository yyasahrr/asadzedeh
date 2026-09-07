import fs from "node:fs";
import path from "node:path";
import { getSessionUser, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { faToday } from "@/lib/format";
import { getInstructorByUser, getSettings, getVideos, writeDb } from "@/lib/store";
import {
  CHUNK_SIZE,
  MAX_VIDEO_BYTES,
  VIDEO_MIME,
  assembleChunks,
  chunkPath,
  newVideoId,
  probeDuration,
  transcodeToHls,
  videoAbsPath,
} from "@/lib/video";
import type { VideoAsset } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Chunked video upload.
 *   POST ?action=init    { name, size, type, title }        -> { uploadId, chunkSize, total }
 *   POST ?action=chunk&uploadId=…&index=N  (body: raw bytes) -> { ok }
 *   POST ?action=finish  { uploadId, total, name, type, title } -> { video }
 *
 * Staff with "videos" permission and instructors can upload.
 * Files go to the private vault (data/videos), never under /public.
 */

async function authorize() {
  const user = await getSessionUser();
  if (!user) return null;
  if (can(user, "videos") || can(user, "courses")) return user;
  if (user.role === "instructor" && getInstructorByUser(user.id)) return user;
  return null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await authorize();
  if (!user) return json({ error: "دسترسی ندارید" }, 403);
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "init") {
    const body = (await req.json()) as { name?: string; size?: number; type?: string };
    const size = Number(body.size ?? 0);
    const type = String(body.type ?? "");
    const ext = path.extname(String(body.name ?? "")).toLowerCase();
    if (!size || size > MAX_VIDEO_BYTES) return json({ error: "حجم فایل مجاز نیست (حداکثر ۴ گیگابایت)" }, 400);
    if (!VIDEO_MIME.includes(type) && ![".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"].includes(ext)) {
      return json({ error: "فرمت ویدیو پشتیبانی نمی‌شود (mp4, mov, webm, mkv)" }, 400);
    }
    const uploadId = newVideoId();
    return json({ uploadId, chunkSize: CHUNK_SIZE, total: Math.ceil(size / CHUNK_SIZE) });
  }

  if (action === "chunk") {
    const uploadId = url.searchParams.get("uploadId") ?? "";
    const index = Number(url.searchParams.get("index"));
    if (!/^v-[a-z0-9-]+$/i.test(uploadId) || !Number.isInteger(index) || index < 0) return json({ error: "پارامتر نامعتبر" }, 400);
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length === 0 || buf.length > CHUNK_SIZE + 1024) return json({ error: "اندازه قطعه نامعتبر" }, 400);
    fs.writeFileSync(chunkPath(uploadId, index), buf);
    return json({ ok: true, index });
  }

  if (action === "finish") {
    const body = (await req.json()) as { uploadId?: string; total?: number; name?: string; type?: string; title?: string };
    const uploadId = String(body.uploadId ?? "");
    const total = Number(body.total ?? 0);
    const maxChunks = Math.ceil(MAX_VIDEO_BYTES / CHUNK_SIZE);
    if (
      !/^v-[a-z0-9-]+$/i.test(uploadId) ||
      !Number.isInteger(total) ||
      total < 1 ||
      total > maxChunks
    ) {
      return json({ error: "پارامتر نامعتبر" }, 400);
    }
    for (let i = 0; i < total; i++) {
      if (!fs.existsSync(chunkPath(uploadId, i))) return json({ error: `قطعه ${i + 1} دریافت نشده؛ دوباره تلاش کنید`, missing: i }, 409);
    }
    const ext = path.extname(String(body.name ?? "video.mp4")).slice(1).toLowerCase() || "mp4";
    if (!["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(ext)) {
      return json({ error: "پسوند ویدیو پشتیبانی نمی‌شود" }, 400);
    }
    const { rel, size } = assembleChunks(uploadId, total, ext);
    const durationSec = await probeDuration(videoAbsPath(rel));
    const video: VideoAsset = {
      id: uploadId,
      title: String(body.title ?? "").trim() || String(body.name ?? "ویدیو").replace(/\.[^.]+$/, ""),
      originalName: String(body.name ?? "video"),
      file: rel,
      sizeBytes: size,
      mime: String(body.type ?? "video/mp4"),
      durationSec,
      status: "uploaded",
      uploadedBy: user.id,
      createdAt: faToday(),
    };
    writeDb({ videos: [video, ...getVideos()] });
    await audit({ action: "video.upload", actor: { id: user.id, name: user.name, role: user.role }, target: `video:${video.id}`, detail: { title: video.title, size, durationSec } });
    if (getSettings().video.transcode) {
      void transcodeToHls(video);
    } else {
      writeDb({ videos: getVideos().map((v) => (v.id === video.id ? { ...v, status: "ready" } : v)) });
    }
    return json({ video });
  }

  return json({ error: "action نامعتبر" }, 400);
}
