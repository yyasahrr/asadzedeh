import "server-only";

export const WORKSHOP_ADDRESS =
  "ارومیه، خیابان امام، خیابان عطایی، کوی دی (نجارخانه)، آموزشگاه اسدزاده";

export interface WorkshopMapLocation {
  lat: number;
  lng: number;
  address: string;
  source: "neshan" | "environment";
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
  const serviceKey = process.env.NESHAN_SERVICE_API_KEY;
  if (!serviceKey) return environmentLocation();

  const query = new URLSearchParams({
    term: WORKSHOP_ADDRESS,
    lat: "37.5527",
    lng: "45.0761",
  });

  try {
    const response = await fetch(`https://api.neshan.org/v1/search?${query}`, {
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
