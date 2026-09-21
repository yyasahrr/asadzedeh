import { describe, expect, it } from "vitest";
import { getIranianCalendarMetadata, getIranianHolidaysForJalaliYear } from "../iranian-holidays";
import { deriveClassCalendarEvents, jalaliMonthGrid } from "../class-schedule";
import type { InPersonClass } from "../types";

describe("Iranian holiday metadata", () => {
  it("detects a known official holiday with its name", () => { const holiday = getIranianCalendarMetadata(1405, 1).holidays.find(item => item.day === 12); expect(holiday).toMatchObject({ name: "روز جمهوری اسلامی ایران", origin: "national" }); });
  it("keeps Friday and official-holiday semantics independent", () => { const cell = jalaliMonthGrid(1405, 3).find(item => item.day === 15 && item.inCurrentMonth); expect(cell?.isFriday).toBe(true); expect(getIranianCalendarMetadata(1405, 3).holidays.some(item => item.day === 15)).toBe(true); });
  it("does not hide class events on holidays", () => { const holidayDate = jalaliMonthGrid(1405, 1).find(item => item.day === 12 && item.inCurrentMonth)!.date; const cls = { slug: "holiday-class", title: "کلاس تعطیل", instructor: "استاد", startDate: holidayDate, days: "", time: "10", sessions: 1, capacity: 5, remaining: 5, location: "", price: 1, image: "/x", excerpt: "", includes: [] } satisfies InPersonClass; expect(deriveClassCalendarEvents([cls])).toHaveLength(1); expect(getIranianCalendarMetadata(1405, 1).holidays.some(item => item.day === 12)).toBe(true); });
  it("gracefully reports years without versioned data", () => { expect(getIranianHolidaysForJalaliYear(1500)).toBeNull(); expect(getIranianCalendarMetadata(1500, 1)).toEqual({ available: false, holidays: [] }); });
});
