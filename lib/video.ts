import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import type { VideoAsset } from "./types";
import { getSettings, getVideos, writeDb } from "./store";

/**
 * Private video vault + processing pipeline.
 *
 * Files live in `data/videos/` (NOT under /public), so they can never be hot-linked.
 * Delivery goes through `/api/video/[id]/...` which checks enrollment and a signed,
 * short-lived token. Optional ffmpeg steps:
 *   - transcode to HLS (segments + playlist) with faststart
 *   - burn a per-student watermark (phone number) into a private copy
 */

export const VAULT = path.join(process.cwd(), "data", "videos");
export const TMP = path.join(VAULT, "tmp");
export const WM_DIR = path.join(VAULT, "wm");

export const VIDEO_MIME = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "video/x-msvideo"];
export const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB per chunk (below Server Action / proxy limits)
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB

function ensureDirs() {
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(WM_DIR, { recursive: true });
}

export function videoAbsPath(rel: string): string {
  const abs = path.resolve(VAULT, rel);
  if (!abs.startsWith(VAULT)) throw new Error("path traversal");
  return abs;
}

/* ---------- ffmpeg discovery ---------- */

let cachedFfmpeg: string | null | undefined;

export function findFfmpeg(): string | null {
  if (cachedFfmpeg !== undefined) return cachedFfmpeg;
  const configured = getSettings().video.ffmpegPath;
  const candidates = [
    configured && configured !== "auto" ? configured : "",
    process.env.FFMPEG_PATH ?? "",
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
  ].filter(Boolean);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const staticPath = require(/* turbopackOptional: true */ "ffmpeg-static") as string | null;
    if (staticPath) candidates.push(staticPath);
  } catch {
    /* optional dependency */
  }
  for (const c of candidates) {
    try {
      fs.accessSync(c, fs.constants.X_OK);
      cachedFfmpeg = c;
      return c;
    } catch {
      /* next */
    }
  }
  // PATH lookup
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    const c = path.join(dir, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
    try {
      fs.accessSync(c, fs.constants.X_OK);
      cachedFfmpeg = c;
      return c;
    } catch {
      /* next */
    }
  }
  cachedFfmpeg = null;
  return null;
}

export function resetFfmpegCache() {
  cachedFfmpeg = undefined;
}

function run(bin: string, args: string[], timeoutMs = 6 * 3600 * 1000): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stderr.on("data", (d) => {
      stderr += String(d);
      if (stderr.length > 20000) stderr = stderr.slice(-10000);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: 1, stderr: String(err) });
    });
  });
}

/** Probe duration via ffmpeg (no ffprobe dependency): parse "Duration: HH:MM:SS.xx". */
export async function probeDuration(abs: string): Promise<number | undefined> {
  const bin = findFfmpeg();
  if (!bin) return undefined;
  const { stderr } = await run(bin, ["-hide_banner", "-i", abs], 60_000);
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  return Math.round(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
}

/* ---------- chunked upload ---------- */

export function newVideoId(): string {
  return `v-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

export function chunkPath(uploadId: string, index: number): string {
  ensureDirs();
  const safe = uploadId.replace(/[^a-z0-9-]/gi, "");
  return path.join(TMP, `${safe}.${index}.part`);
}

/** Concatenate chunks into the final file; returns relative path in vault. */
export function assembleChunks(uploadId: string, total: number, ext: string): { rel: string; size: number } {
  ensureDirs();
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "mp4";
  const rel = `${uploadId}.${safeExt}`;
  const out = path.join(VAULT, rel);
  const fd = fs.openSync(out, "w");
  let size = 0;
  try {
    for (let i = 0; i < total; i++) {
      const p = chunkPath(uploadId, i);
      const buf = fs.readFileSync(p);
      fs.writeSync(fd, buf);
      size += buf.length;
      fs.unlinkSync(p);
    }
  } finally {
    fs.closeSync(fd);
  }
  return { rel, size };
}

/* ---------- processing (HLS transcode) ---------- */

function patchVideo(id: string, patch: Partial<VideoAsset>) {
  writeDb({ videos: getVideos().map((v) => (v.id === id ? { ...v, ...patch } : v)) });
}

const inflight = new Set<string>();

/**
 * Transcode to HLS (H.264 720p, AAC) with 6-second segments.
 * Runs in the background; status is tracked on the VideoAsset.
 */
export async function transcodeToHls(video: VideoAsset): Promise<void> {
  if (inflight.has(video.id)) return;
  const bin = findFfmpeg();
  if (!bin) {
    patchVideo(video.id, { status: "ready", note: "ffmpeg در دسترس نیست؛ فایل اصلی با پخش امن ارائه می‌شود" });
    return;
  }
  inflight.add(video.id);
  patchVideo(video.id, { status: "processing", note: "در حال تبدیل به HLS…" });
  const src = videoAbsPath(video.file);
  const outDir = path.join(VAULT, `${video.id}_hls`);
  fs.mkdirSync(outDir, { recursive: true });
  const playlist = path.join(outDir, "index.m3u8");
  const args = [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", src,
    "-vf", "scale='min(1280,iw)':-2",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-profile:v", "main",
    "-c:a", "aac", "-b:a", "128k", "-ac", "2",
    "-movflags", "+faststart",
    "-hls_time", "6", "-hls_playlist_type", "vod", "-hls_list_size", "0",
    "-hls_segment_filename", path.join(outDir, "seg_%04d.ts"),
    playlist,
  ];
  const { code, stderr } = await run(bin, args);
  inflight.delete(video.id);
  if (code === 0 && fs.existsSync(playlist)) {
    const durationSec = video.durationSec ?? (await probeDuration(src));
    patchVideo(video.id, { status: "ready", hls: `${video.id}_hls/index.m3u8`, durationSec, note: "HLS آماده است" });
  } else {
    patchVideo(video.id, { status: "ready", note: `تبدیل HLS ناموفق (فایل اصلی پخش می‌شود): ${stderr.slice(-300)}` });
  }
}

/* ---------- burned-in watermark (per-student copy) ---------- */

export function watermarkedPath(videoId: string, phone: string): string {
  const key = crypto.createHash("sha1").update(`${videoId}:${phone}`).digest("hex").slice(0, 16);
  return path.join(WM_DIR, `${videoId}_${key}.mp4`);
}

const wmInflight = new Set<string>();

/**
 * Create (once) a private copy of the video with the buyer's phone number burned in
 * (drawtext, semi-transparent, moves between 4 corners every ~10s).
 * Returns the absolute path if ready, or null if still processing / unavailable.
 */
export async function ensureWatermarkedCopy(video: VideoAsset, phone: string): Promise<string | null> {
  const out = watermarkedPath(video.id, phone);
  if (fs.existsSync(out)) return out;
  const bin = findFfmpeg();
  if (!bin) return null;
  if (wmInflight.has(out)) return null;
  wmInflight.add(out);
  ensureDirs();
  const src = videoAbsPath(video.file);
  const text = phone.replace(/[^0-9+]/g, "");
  // Position cycles every 10 seconds between the four corners.
  const x = "if(lt(mod(t\\,40)\\,10)\\,20\\,if(lt(mod(t\\,40)\\,20)\\,w-tw-20\\,if(lt(mod(t\\,40)\\,30)\\,w-tw-20\\,20)))";
  const y = "if(lt(mod(t\\,40)\\,10)\\,20\\,if(lt(mod(t\\,40)\\,20)\\,20\\,if(lt(mod(t\\,40)\\,30)\\,h-th-20\\,h-th-20)))";
  const draw = `drawtext=text='${text}':fontcolor=white@0.45:fontsize=h/28:box=1:boxcolor=black@0.25:boxborderw=8:x=${x}:y=${y}`;
  const tmpOut = `${out}.tmp.mp4`;
  const args = [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", src,
    "-vf", draw,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
    "-c:a", "copy",
    "-movflags", "+faststart",
    tmpOut,
  ];
  run(bin, args).then(({ code }) => {
    wmInflight.delete(out);
    if (code === 0 && fs.existsSync(tmpOut)) fs.renameSync(tmpOut, out);
    else {
      try { fs.unlinkSync(tmpOut); } catch { /* ignore */ }
    }
  });
  return null;
}

/* ---------- cleanup ---------- */

export function deleteVideoFiles(video: VideoAsset) {
  const targets = [path.join(VAULT, video.file), path.join(VAULT, `${video.id}_hls`)];
  for (const t of targets) {
    try {
      fs.rmSync(t, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  try {
    for (const f of fs.readdirSync(WM_DIR)) if (f.startsWith(`${video.id}_`)) fs.unlinkSync(path.join(WM_DIR, f));
  } catch {
    /* ignore */
  }
}

export function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

export { formatDuration } from "./format";
