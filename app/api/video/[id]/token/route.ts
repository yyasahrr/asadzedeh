import { getSessionUser, signPayload } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { resolveAccess } from "@/lib/access";
import { getSettings, getVideo } from "@/lib/store";
import { ensureWatermarkedCopy } from "@/lib/video";

export const dynamic = "force-dynamic";

/**
 * Issue a short-lived, signed playback token for the secure player.
 * The token is bound to the video, the user, and the user agent; it expires
 * after `video.signedUrlSeconds` so a copied URL dies quickly.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const video = getVideo(id);
  if (!video) return Response.json({ error: "ویدیو پیدا نشد" }, { status: 404 });
  const { ctx, access } = resolveAccess(user, video);
  if (!access.ok) {
    await audit({ action: "video.denied", level: "security", actor: user ? { id: user.id, name: user.name, role: user.role } : null, target: `video:${id}`, detail: { reason: access.reason } });
    return Response.json({ error: access.reason ?? "دسترسی ندارید" }, { status: 403 });
  }

  const settings = getSettings();
  const protection = ctx.course?.protection ?? settings.video.defaults;
  const ttl = Math.max(60, settings.video.signedUrlSeconds || 900);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 80);

  // Which source: HLS (preferred), burned-in watermark copy, or original file.
  let source: "hls" | "wm" | "file" = video.hls ? "hls" : "file";
  if (access.watermark && protection.burnWatermark && user) {
    const ready = await ensureWatermarkedCopy(video, user.phone);
    if (ready) source = "wm";
    // if not ready yet, fall back to HLS/file + overlay watermark; the copy is prepared in background.
  }

  const exp = Date.now() + ttl * 1000;
  const token = signPayload({ v: id, u: user?.id ?? "anon", s: source, ua, exp });
  const watermarkText = access.watermark && user ? user.phone : "";

  await audit({ action: "video.play", actor: user ? { id: user.id, name: user.name, role: user.role } : null, target: `video:${id}`, detail: { course: ctx.course?.slug, lesson: ctx.lesson?.id, source } });

  return Response.json({
    token,
    exp,
    source,
    src: source === "hls" ? `/api/video/${id}/hls/index.m3u8?t=${token}` : `/api/video/${id}/stream?t=${token}`,
    watermark: protection.overlayWatermark ? { text: watermarkText, extra: settings.video.watermarkExtra, intervalSec: settings.video.watermarkIntervalSec } : null,
    blockDownload: protection.blockDownload,
    durationSec: video.durationSec ?? null,
    color: settings.video.playerColor,
  });
}
