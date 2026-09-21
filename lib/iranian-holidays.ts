export type IranianHoliday = { month: number; day: number; name: string; origin: "solar" | "lunar" | "national" };

// Versioned, offline calendar data. Lunar observances are snapshots of the
// published Iranian calendar for the stated year and are not extrapolated.
const HOLIDAYS: Record<number, readonly IranianHoliday[]> = {
  1405: [
    { month: 1, day: 1, name: "آغاز نوروز و عید سعید فطر", origin: "national" },
    { month: 1, day: 2, name: "عید نوروز و تعطیل عید فطر", origin: "national" },
    { month: 1, day: 3, name: "عید نوروز", origin: "solar" },
    { month: 1, day: 4, name: "عید نوروز", origin: "solar" },
    { month: 1, day: 12, name: "روز جمهوری اسلامی ایران", origin: "national" },
    { month: 1, day: 13, name: "روز طبیعت", origin: "solar" },
    { month: 1, day: 25, name: "شهادت امام جعفر صادق (ع)", origin: "lunar" },
    { month: 3, day: 6, name: "عید سعید قربان", origin: "lunar" },
    { month: 3, day: 14, name: "رحلت امام خمینی و عید سعید غدیر", origin: "national" },
    { month: 3, day: 15, name: "قیام پانزده خرداد", origin: "national" },
    { month: 4, day: 3, name: "تاسوعای حسینی", origin: "lunar" },
    { month: 4, day: 4, name: "عاشورای حسینی", origin: "lunar" },
    { month: 5, day: 13, name: "اربعین حسینی", origin: "lunar" },
    { month: 5, day: 21, name: "رحلت پیامبر اکرم (ص) و شهادت امام حسن مجتبی (ع)", origin: "lunar" },
    { month: 5, day: 22, name: "شهادت امام رضا (ع)", origin: "lunar" },
    { month: 5, day: 30, name: "شهادت امام حسن عسکری (ع)", origin: "lunar" },
    { month: 6, day: 8, name: "ولادت پیامبر اکرم (ص) و امام جعفر صادق (ع)", origin: "lunar" },
    { month: 8, day: 22, name: "شهادت حضرت فاطمه زهرا (س)", origin: "lunar" },
    { month: 10, day: 2, name: "ولادت امام علی (ع) و روز پدر", origin: "lunar" },
    { month: 10, day: 16, name: "مبعث پیامبر اکرم (ص)", origin: "lunar" },
    { month: 11, day: 4, name: "نیمه شعبان", origin: "lunar" },
    { month: 11, day: 22, name: "پیروزی انقلاب اسلامی ایران", origin: "national" },
    { month: 12, day: 9, name: "شهادت امام علی (ع)", origin: "lunar" },
    { month: 12, day: 19, name: "عید سعید فطر", origin: "lunar" },
    { month: 12, day: 20, name: "تعطیل عید سعید فطر", origin: "lunar" },
    { month: 12, day: 29, name: "روز ملی شدن صنعت نفت ایران", origin: "national" },
  ],
};

export function getIranianHolidaysForJalaliYear(year: number): readonly IranianHoliday[] | null {
  return HOLIDAYS[year] ?? null;
}

export function getIranianCalendarMetadata(year: number, month: number) {
  const yearData = getIranianHolidaysForJalaliYear(year);
  return { available: yearData !== null, holidays: (yearData ?? []).filter(item => item.month === month) };
}
