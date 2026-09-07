import "server-only";
import { fetchWithTimeout } from "./http";
import { getSettings } from "./store";

export const WORKSHOP_ADDRESS =
  "ارومیه، خیابان امام، خیابان عطایی، کوی دی (نجارخانه)، آموزشگاه اسدزاده";

export interface WorkshopMapLocation {
  lat: number;
  lng: number;
  address: string;
  source: "neshan" | "environment" | "settings";
}

interface NeshanSearchResponse {
  items?: Array<{
    title?: string;
    address?: string;
    location?: { x?: number; y?: number };
  }>;
}

function environmentLocation(): WorkshopMapLocation | null {
  const lat = Number(process.env.WORKSHOP_LAT);
  const lng = Number(process.env.WORKSHOP_LNG);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null;
  return { lat, lng, address: WORKSHOP_ADDRESS, source: "environment" };
}

export async function getWorkshopMapLocation(): Promise<WorkshopMapLocation | null> {
  const settings = getSettings();
  const workshop = settings.site.workshop;
  if (workshop && Number.isFinite(workshop.lat) && Number.isFinite(workshop.lng) && workshop.lat !== 0 && workshop.lng !== 0) {
    return {
      lat: workshop.lat,
      lng: workshop.lng,
      address: workshop.address || WORKSHOP_ADDRESS,
      source: "settings",
    };
  }

  const serviceKey = process.env.NESHAN_SERVICE_API_KEY;
  if (!serviceKey) return environmentLocation();

  const query = new URLSearchParams({
    term: WORKSHOP_ADDRESS,
    lat: "37.5527",
    lng: "45.0761",
  });

  try {
    const response = await fetchWithTimeout(`https://api.neshan.org/v1/search?${query}`, {
      timeoutMs: 8_000,
      retry: { attempts: 2 },
      event: "geocode.neshan",
      headers: { "Api-Key": serviceKey },
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return environmentLocation();

    const data = (await response.json()) as NeshanSearchResponse;
    const result = data.items?.find(
      (item) => Number.isFinite(item.location?.x) && Number.isFinite(item.location?.y),
    );
    if (!result?.location?.x || !result.location.y) return environmentLocation();

    return {
      lng: result.location.x,
      lat: result.location.y,
      address: result.address || result.title || WORKSHOP_ADDRESS,
      source: "neshan",
    };
  } catch {
    return environmentLocation();
  }
}
