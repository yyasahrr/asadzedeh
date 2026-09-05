import fs from "node:fs";
import { verifySigned } from "@/lib/auth";
import { getVideo } from "@/lib/store";
import { videoAbsPath, watermarkedPath } from "@/lib/video";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Byte-range streaming of the original (or watermarked) MP4 from the private vault.
 * Requires a valid signed token issued by /token; the file path is never exposed.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const t = url.searchParams.get("t") ?? "";
  const payload = verifySigned<{ v: string; u: string; s: string; ua: string; exp: number }>(t);
  if (!payload || payload.v !== id) return new Response("forbidden", { status: 403 });
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 80);
  if (payload.ua && payload.ua !== ua) return new Response("forbidden", { status: 403 });

  const video = getVideo(id);
  if (!video) return new Response("not found", { status: 404 });

  let abs = videoAbsPath(video.file);
  if (payload.s === "wm") {
    const user = await getSessionUser();
    if (!user || user.id !== payload.u) return new Response("forbidden", { status: 403 });
    const wm = watermarkedPath(video.id, user.phone);
    if (fs.existsSync(wm)) abs = wm;
  }
  if (!fs.existsSync(abs)) return new Response("not found", { status: 404 });

  const stat = fs.statSync(abs);
  const range = req.headers.get("range");
  const headers: Record<string, string> = {
    "content-type": video.mime.startsWith("video/") ? (abs.endsWith(".mp4") ? "video/mp4" : video.mime) : "video/mp4",
    "accept-ranges": "bytes",
    "cache-control": "private, no-store",
    "content-disposition": "inline",
    "x-content-type-options": "nosniff",
  };

  if (range) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    let start = m && m[1] ? Number(m[1]) : 0;
    let end = m && m[2] ? Number(m[2]) : Math.min(start + 4 * 1024 * 1024 - 1, stat.size - 1);
    if (!Number.isFinite(start) || start >= stat.size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${stat.size}` } });
    if (end >= stat.size) end = stat.size - 1;
    if (end < start) [start, end] = [end, start];
    const stream = fs.createReadStream(abs, { start, end });
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${stat.size}`, "content-length": String(end - start + 1) },
    });
  }

  const stream = fs.createReadStream(abs);
  return new Response(stream as unknown as ReadableStream, { status: 200, headers: { ...headers, "content-length": String(stat.size) } });
}
