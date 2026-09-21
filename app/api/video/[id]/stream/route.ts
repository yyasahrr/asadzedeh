import { getSessionUser, verifySigned } from "@/lib/auth";
import { getVideo } from "@/lib/store";
import { openVideo } from "@/lib/video";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Byte-range playback of a course video, proxied from private object storage.
 *
 * Why proxy rather than hand out a storage URL:
 *   - the bucket stays private, with no public-read ACL and no bucket policy;
 *   - no object URL, key or credential ever reaches the browser, so there is
 *     nothing to copy into a download manager;
 *   - every byte is served only after the signed token — and, for watermarked
 *     copies, the live session — has been checked.
 *
 * A copied token still dies on its own: it is bound to the video, the user and
 * the user agent, and it expires.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const t = url.searchParams.get("t") ?? "";
  const payload = verifySigned<{ v: string; u: string; s: string; ua: string; exp: number; scope?: string }>(t);
  if (!payload || payload.v !== id) return new Response("forbidden", { status: 403 });

  const ua = (req.headers.get("user-agent") ?? "").slice(0, 80);
  if (payload.ua && payload.ua !== ua) return new Response("forbidden", { status: 403 });

  // The token is short-lived, but a session can be revoked before it expires.
  // Re-checking the user here means a logged-out or banned student stops
  // mid-playback instead of finishing the lesson.
  if (payload.u === "anon" && payload.scope !== "public-site-media") return new Response("forbidden", { status: 403 });
  if (payload.u !== "anon") {
    if (payload.scope !== "authenticated-playback") return new Response("forbidden", { status: 403 });
    const user = await getSessionUser();
    if (!user || user.id !== payload.u) return new Response("forbidden", { status: 403 });
  }

  const video = getVideo(id);
  if (!video) return new Response("not found", { status: 404 });
  if (video.status !== "ready") {
    return new Response("ویدیو هنوز آماده نیست", { status: 409 });
  }

  // Resolve the requested range before opening the object, so a syntactically
  // valid but out-of-bounds range answers 416 instead of an empty 200.
  const head = await openVideo(video);
  if (!head) return new Response("not found", { status: 404 });
  const size = head.size;

  const baseHeaders: Record<string, string> = {
    "content-type": video.mime.startsWith("video/") ? video.mime : "video/mp4",
    "accept-ranges": "bytes",
    // no-store, not private/max-age: a signed playback response must never be
    // cached by a shared proxy or written to disk on a managed machine.
    "cache-control": "private, no-store",
    "content-disposition": "inline",
    "x-content-type-options": "nosniff",
  };

  const rangeHeader = req.headers.get("range");
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    let start = match?.[1] ? Number(match[1]) : 0;
    // An open-ended range gets a bounded window: enough to seek and start
    // playing without pulling a multi-gigabyte file through one connection.
    let end = match?.[2] ? Number(match[2]) : Math.min(start + 4 * 1024 * 1024 - 1, size - 1);

    if (!Number.isFinite(start) || start < 0 || start >= size) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    if (!Number.isFinite(end) || end >= size) end = size - 1;
    if (end < start) [start, end] = [end, start];

    const body = await openVideo(video, { start, end });
    if (!body) {
      logger.error({ event: "video.range.unavailable", id, start, end });
      return new Response("not found", { status: 404 });
    }
    return new Response(body.body as unknown as ReadableStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        "content-range": `bytes ${start}-${end}/${size}`,
        "content-length": String(end - start + 1),
      },
    });
  }

  return new Response(head.body as unknown as ReadableStream, {
    status: 200,
    headers: { ...baseHeaders, "content-length": String(size) },
  });
}
