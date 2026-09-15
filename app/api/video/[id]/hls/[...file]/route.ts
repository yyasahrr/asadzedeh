import { verifySigned } from "@/lib/auth";
import { getVideo } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * HLS playlist and segment delivery.
 *
 * Transcoding is disabled in this release (no ffmpeg dependency), so no video
 * has an `hls` key and this route never serves a playlist. It is kept rather
 * than deleted for one reason: a token issued before a redeploy, or a stale
 * player page, must get a clear answer instead of a 404 that looks like a
 * missing file — the difference between "not produced" and "lost" is what an
 * operator needs in the log.
 *
 * The authorization check stays first. An unauthenticated caller must not be
 * able to tell which video ids exist.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; file: string[] }> }) {
  const { id, file } = await params;
  const url = new URL(req.url);
  const t = url.searchParams.get("t") ?? "";
  const payload = verifySigned<{ v: string; ua: string; exp: number }>(t);
  if (!payload || payload.v !== id) return new Response("forbidden", { status: 403 });

  const ua = (req.headers.get("user-agent") ?? "").slice(0, 80);
  if (payload.ua && payload.ua !== ua) return new Response("forbidden", { status: 403 });

  const video = getVideo(id);
  if (!video) return new Response("not found", { status: 404 });

  const name = file.join("/");
  if (!/^[a-z0-9_.-]+$/i.test(name) || name.includes("..")) return new Response("bad request", { status: 400 });

  if (!video.hls) {
    return new Response("پخش HLS برای این ویدیو تولید نشده است", { status: 410 });
  }

  return new Response("پخش HLS در این نسخه غیرفعال است", { status: 410 });
}
