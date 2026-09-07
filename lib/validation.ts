/** Small runtime validation helpers used by server actions. */

export function isValidLatitude(value: number | string | undefined | null): boolean {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= -90 && n <= 90;
}

export function isValidLongitude(value: number | string | undefined | null): boolean {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= -180 && n <= 180;
}

export function clampText(value: string | undefined | null, max: number): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length > max) return "";
  return trimmed;
}

export function isTicketStatus(value: unknown): value is "باز" | "در حال بررسی" | "پاسخ داده شده" | "بسته شده" {
  return typeof value === "string" && ["باز", "در حال بررسی", "پاسخ داده شده", "بسته شده"].includes(value);
}
