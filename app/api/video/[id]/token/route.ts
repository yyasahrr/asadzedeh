import { getSessionUser, signPayload } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { resolveAccess } from "@/lib/access";
import { getSettings, getVideo } from "@/lib/store";
import { isPublicSiteVideo } from "@/lib/public-site-video";

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
  if (video.status !== "ready") return Response.json({ error: "ویدیو آماده پخش نیست" }, { status: 409 });
  const { ctx, access } = resolveAccess(user, video);
  const publicSiteMedia = !user && isPublicSiteVideo(id);
  if (!access.ok && !publicSiteMedia) {
    await audit({ action: "video.denied", level: "security", actor: user ? { id: user.id, name: user.name, role: user.role } : null, target: `video:${id}`, detail: { reason: access.reason } });
    return Response.json({ error: access.reason ?? "دسترسی ندارید" }, { status: 403 });
  }

  const settings = getSettings();
  const protection = ctx.course?.protection ?? settings.video.defaults;
  const ttl = Math.max(60, settings.video.signedUrlSeconds || 900);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 80);

  // Delivery source. HLS and the burned-in watermark both need ffmpeg, which is
  // out of scope for this release, so the original file is always what plays.
  // The overlay watermark (moving text drawn by the player) still identifies the
  // viewer on screen — degradation is visible to the operator, not silent.
  const source: "hls" | "wm" | "file" = "file";
  const watermarkText = access.ok && access.watermark && user ? user.phone : "";

  const exp = Date.now() + ttl * 1000;
  const scope = publicSiteMedia ? "public-site-media" : "authenticated-playback";
  const token = signPayload({ v: id, u: user?.id ?? "anon", s: source, ua, exp, scope });

  await audit({
    action: "video.play",
    actor: user ? { id: user.id, name: user.name, role: user.role } : null,
    target: `video:${id}`,
    detail: { course: ctx.course?.slug, class: ctx.inPersonClass?.slug, lesson: ctx.lesson?.id, source, scope },
  });

  return Response.json({
    token,
    exp,
    source,
    src: `/api/video/${id}/stream?t=${token}`,
    watermark: protection.overlayWatermark ? { text: watermarkText, extra: settings.video.watermarkExtra, intervalSec: settings.video.watermarkIntervalSec } : null,
    blockDownload: protection.blockDownload,
    durationSec: video.durationSec ?? null,
    color: settings.video.playerColor,
  });
}
