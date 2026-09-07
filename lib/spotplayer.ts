import { fetchWithTimeout } from "./http";
import { getSettings } from "./store";

/**
 * SpotPlayer DRM integration (https://spotplayer.ir/help/api).
 *
 * Creates a per-student license bound to the buyer's phone number (watermark)
 * and the course id(s) configured for the course. The student installs the
 * SpotPlayer app (Windows / macOS / Android / iOS / Web) and enters the key.
 */

export interface SpotLicense {
  id: string;
  key: string;
  url: string;
}

interface SpotResponse {
  _id?: string;
  key?: string;
  url?: string;
  ex?: { msg?: string };
}

/** API key from admin settings, with the SPOTPLAYER_API_KEY env var as a fallback (keeps the key out of db.json). */
function spotConfig() {
  const s = getSettings().spotplayer;
  return { ...s, apiKey: s.apiKey || process.env.SPOTPLAYER_API_KEY || "" };
}

export function spotPlayerConfigured(): boolean {
  const s = spotConfig();
  return s.enabled && !!s.apiKey;
}

export async function createSpotLicense(opts: {
  name: string;
  phone: string;
  courseIds: string[];
  payload?: string;
}): Promise<{ ok: true; license: SpotLicense } | { ok: false; error: string }> {
  const s = spotConfig();
  if (!s.enabled || !s.apiKey) return { ok: false, error: "اسپات‌پلیر فعال نیست یا کلید API وارد نشده" };
  const courseIds = opts.courseIds.filter(Boolean);
  if (courseIds.length === 0 && s.defaultCourseId) courseIds.push(s.defaultCourseId);
  if (courseIds.length === 0) return { ok: false, error: "شناسه دوره اسپات‌پلیر تنظیم نشده" };

  const body = {
    test: s.test,
    name: opts.name,
    course: courseIds,
    payload: opts.payload ?? "",
    watermark: {
      texts: [{ text: opts.phone }],
    },
    device: {
      p0: s.devices.all,
      p1: s.devices.windows,
      p2: s.devices.mac,
      p4: s.devices.android,
      p5: s.devices.ios,
      p6: s.devices.web,
    },
  };

  try {
    const res = await fetchWithTimeout("https://panel.spotplayer.ir/license/edit/", {
      timeoutMs: 20_000,
      event: "spotplayer.license",
      method: "POST",
      headers: {
        "content-type": "application/json",
        $API: s.apiKey,
        $LEVEL: "-1",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as SpotResponse;
    if (data.ex?.msg) return { ok: false, error: data.ex.msg };
    if (!data._id || !data.key) return { ok: false, error: "پاسخ نامعتبر از اسپات‌پلیر" };
    return {
      ok: true,
      license: { id: data._id, key: data.key, url: `https://dl.spotplayer.ir/${data.url ?? ""}` },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به اسپات‌پلیر" };
  }
}
