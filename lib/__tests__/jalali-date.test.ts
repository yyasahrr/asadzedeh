import { describe, expect, it } from "vitest";
import { formatJalaliDate, gregorianToJalali, isValidJalaliDate, jalaliSelectionToStoredDate, jalaliToGregorian, legacyJalaliLabelToGregorian, parseStoredDate, toEnglishDigits, toPersianDigits } from "../jalali-date";

describe("Jalali date utilities", () => {
  it("converts date-only values without timezone drift", () => {
    expect(jalaliToGregorian("1405/07/25")).toBe("2026-10-17");
    expect(gregorianToJalali("2026-10-17")).toBe("1405/07/25");
    expect(formatJalaliDate("2026-10-17")).toBe("۱۴۰۵/۰۷/۲۵");
  });

  it("accepts Persian digits", () => {
    expect(jalaliToGregorian("۱۴۰۵/۰۷/۲۵")).toBe("2026-10-17");
    expect(toEnglishDigits("۱۴۰۵/۰۷/۲۵")).toBe("1405/07/25");
    expect(toPersianDigits("1405/07/25")).toBe("۱۴۰۵/۰۷/۲۵");
  });

  it("stores a selected Jalali calendar day as Gregorian ISO", () => {
    expect(jalaliSelectionToStoredDate(1405, 7, 25)).toBe("2026-10-17");
    expect(parseStoredDate(jalaliSelectionToStoredDate(1405, 7, 25))).toBe("2026-10-17");
  });

  it("derives legacy named labels without changing canonical storage", () => {
    expect(legacyJalaliLabelToGregorian("۲۵ مهر", 1405)).toBe("2026-10-17");
    expect(legacyJalaliLabelToGregorian("not-a-date", 1405)).toBeNull();
  });

  it("validates leap-day and rejects invalid or empty values", () => {
    expect(isValidJalaliDate("1399/12/30")).toBe(true);
    expect(isValidJalaliDate("1400/12/30")).toBe(false);
    expect(isValidJalaliDate("1405/07/32")).toBe(false);
    expect(parseStoredDate("")).toBeNull();
    expect(parseStoredDate("2026-02-30")).toBeNull();
  });
});
