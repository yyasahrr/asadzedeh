const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const JALALI_DATE = /^(\d{4})\/(\d{2})\/(\d{2})$/;
const persianFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric",
});

export const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"] as const;

export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function jalaliParts(date: Date): { year: number; month: number; day: number } {
  const parts = persianFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

export function parseStoredDate(value?: string | null): string | null {
  const normalized = toEnglishDigits(String(value ?? "").trim()).replaceAll("/", "-");
  const match = ISO_DATE.exec(normalized);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]) ? normalized : null;
}

export function gregorianToJalali(value: string): string | null {
  const stored = parseStoredDate(value);
  if (!stored) return null;
  const [year, month, day] = stored.split("-").map(Number);
  const result = jalaliParts(new Date(Date.UTC(year, month - 1, day)));
  return `${result.year}/${String(result.month).padStart(2, "0")}/${String(result.day).padStart(2, "0")}`;
}

export function jalaliToGregorian(value: string): string | null {
  const normalized = toEnglishDigits(value.trim());
  const match = JALALI_DATE.exec(normalized);
  if (!match) return null;
  const target = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (target.month < 1 || target.month > 12 || target.day < 1 || target.day > 31) return null;
  // A Jalali year starts in March of Gregorian year +621. Start a little
  // earlier and scan one full year so date-only conversion stays timezone-free.
  const start = Date.UTC(target.year + 621, 1, 15);
  for (let offset = 0; offset < 430; offset += 1) {
    const date = new Date(start + offset * 86_400_000);
    const parts = jalaliParts(date);
    if (parts.year === target.year && parts.month === target.month && parts.day === target.day) {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    }
  }
  return null;
}

export function isValidJalaliDate(value: string): boolean {
  return jalaliToGregorian(value) !== null;
}

export function formatJalaliDate(value?: string | null): string {
  if (!value) return "—";
  const jalali = gregorianToJalali(value);
  return jalali ? toPersianDigits(jalali) : value;
}

export function formatJalaliDateLong(value?: string | null): string {
  const stored = parseStoredDate(value);
  if (!stored) return value || "—";
  const [year, month, day] = stored.split("-").map(Number);
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
