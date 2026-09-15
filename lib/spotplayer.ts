import { getSettings } from "./store";

/**
 * SpotPlayer DRM integration — disabled in this RC.
 *
 * The RC decision is: no DRM, no per-user transcoding, no external licensing
 * in this phase. Videos are delivered via the private S3 bucket + secure player
 * (signed token + enrolment check + moving overlay watermark).
 *
 * The code is kept for backward compatibility (old courses may still have
 * spotPlayer:true) but always reports "not configured" and refuses to create
 * licenses. This prevents a paid order from hanging on an external service
 * that is intentionally out of scope.
 */

export interface SpotLicense {
  id: string;
  key: string;
  url: string;
}

function spotConfig() {
  const s = getSettings().spotplayer;
  return { ...s, apiKey: s.apiKey || process.env.SPOTPLAYER_API_KEY || "" };
}

export function spotPlayerConfigured(): boolean {
  // RC: always false — DRM out of scope
  return false;
}

export async function createSpotLicense(opts: {
  name: string;
  phone: string;
  courseIds: string[];
  payload?: string;
}): Promise<{ ok: true; license: SpotLicense } | { ok: false; error: string }> {
  // RC: refuse explicitly so callers can audit the skip rather than throw
  void spotConfig();
  void opts;
  return { ok: false, error: "اسپات‌پلیر در این نسخه غیرفعال است (پخش امن S3 فعال است)" };
}
