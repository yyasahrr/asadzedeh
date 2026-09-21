import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Search, Users } from "lucide-react";
import { appUrl } from "@/lib/env";
import { availableSeats, getClasses, getInstructors } from "@/lib/store";
import { adjacentJalaliMonth, classCategory, classMatchesScheduleFilters, classScheduleStatusLabels, currentJalaliMonth, deriveClassCalendarEvents, deriveClassScheduleStatus, jalaliMonthGrid, type ClassCalendarEvent, type ClassScheduleStatus } from "@/lib/class-schedule";
import { formatJalaliDateLong, JALALI_MONTHS, toPersianDigits } from "@/lib/jalali-date";
import { getIranianCalendarMetadata } from "@/lib/iranian-holidays";
import { formatPrice } from "@/lib/format";
import { getClassInstructorSlugs } from "@/lib/instructors";

export const metadata: Metadata = { title: "برنامه کلاس‌های حضوری", description: "تقویم شمسی کلاس‌ها، جلسه‌ها، ظرفیت و زمان ثبت‌نام آموزشگاه اسدزاده", alternates: { canonical: `${appUrl()}/classes/schedule` } };
const allowed = new Set<ClassScheduleStatus>(["open", "limited", "full", "started", "completed", "cancelled"]);
const statusTone: Record<ClassScheduleStatus, string> = { open: "bg-teal-50 text-teal-800", limited: "bg-ochre-50 text-ochre-800", full: "bg-madder-50 text-madder-800", started: "bg-blue-50 text-blue-800", completed: "bg-sand-100 text-ink-600", cancelled: "bg-madder-50 text-madder-700" };
const sessionLabels = { scheduled: "برگزار می‌شود", completed: "برگزار شده", postponed: "به تعویق افتاده", cancelled: "لغو شده", "class-start": "شروع کلاس" } as const;

type Query = Record<string, string | string[] | undefined>;
function queryHref(query: Query, patch: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (typeof value === "string" && value) params.set(key, value);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) params.delete(key);
    else params.set(key, String(value));
  }
  return `?${params.toString()}`;
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Query> }) {
  const q = await searchParams;
  const instructors = getInstructors();
  const instructorMap = new Map(instructors.map(item => [item.slug, item.name]));
  const now = currentJalaliMonth();
  const requestedYear = Number(typeof q.year === "string" ? q.year : "");
  const requestedMonth = Number(typeof q.month === "string" ? q.month : "");
  const year = Number.isInteger(requestedYear) && requestedYear >= 1200 && requestedYear <= 1600 ? requestedYear : now.year;
  const month = Number.isInteger(requestedMonth) ? Math.min(12, Math.max(1, requestedMonth)) : now.month;
  const query = typeof q.q === "string" ? q.q : "";
  const statusQuery = typeof q.status === "string" ? q.status : "";
  const categoryQuery = typeof q.category === "string" ? q.category : "";
  const instructorQuery = typeof q.instructor === "string" ? q.instructor : "";
  const scopeQuery = q.scope === "current" || q.scope === "next" ? q.scope : "";
  const allClasses = getClasses();
  const classes = allClasses.map(item => ({ item, status: deriveClassScheduleStatus(item), category: classCategory(item), instructorNames: getClassInstructorSlugs(item).map(slug => instructorMap.get(slug)).filter((name): name is string => Boolean(name)) }))
    .filter(row => !statusQuery || !allowed.has(statusQuery as ClassScheduleStatus) || row.status === statusQuery)
    .filter(row => classMatchesScheduleFilters(row.item, { query, category: categoryQuery, instructor: instructorQuery, scope: scopeQuery, year, month }, row.instructorNames));
  const categories = [...new Set(allClasses.map(classCategory))];
  const view = q.view === "calendar" ? "calendar" : "list";
  const grid = jalaliMonthGrid(year, month);
  const events = deriveClassCalendarEvents(classes.map(row => row.item), instructorMap, now.year);
  const eventsByDate = new Map<string, ClassCalendarEvent[]>();
  for (const event of events) eventsByDate.set(event.date, [...(eventsByDate.get(event.date) ?? []), event]);
  const holidayMetadata = getIranianCalendarMetadata(year, month);
  const holidays = new Map(holidayMetadata.holidays.map(item => [item.day, item]));
  const previous = adjacentJalaliMonth(year, month, -1);
  const next = adjacentJalaliMonth(year, month, 1);
  const today = new Date().toISOString().slice(0, 10);
  const monthHasEvents = grid.some(cell => cell.inCurrentMonth && (eventsByDate.get(cell.date)?.length ?? 0) > 0);
  const filtersActive = Boolean(query || statusQuery || categoryQuery || instructorQuery || scopeQuery);

  return <main className="shell py-8 sm:py-10"><header className="max-w-3xl"><p className="text-sm font-bold text-madder-700">تقویم آموزشگاه</p><h1 className="mt-2 text-3xl font-black text-navy-900">برنامه کلاس‌های حضوری</h1><p className="mt-3 leading-8 text-ink-600">تاریخ شروع، جلسه‌ها، مدرس و ظرفیت کلاس‌ها مستقیماً از برنامه ثبت‌شده هر کلاس نمایش داده می‌شود.</p></header>
    <form className="mt-7 grid gap-3 rounded-2xl border border-ink-900/10 bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"><input type="hidden" name="view" value={view} />{view === "calendar" ? <><input type="hidden" name="year" value={year} /><input type="hidden" name="month" value={month} /></> : null}<label className="relative lg:col-span-2"><span className="sr-only">جست‌وجو</span><Search className="absolute right-3 top-3 h-4 w-4 text-ink-400" aria-hidden /><input name="q" defaultValue={query} placeholder="جست‌وجوی کلاس، دسته یا مدرس" className="h-10 w-full rounded-lg border pr-9 pl-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600" /></label><select aria-label="وضعیت کلاس" name="status" defaultValue={statusQuery} className="h-10 rounded-lg border bg-white px-2 text-sm"><option value="">همه وضعیت‌ها</option><option value="open">ثبت‌نام باز</option><option value="limited">ظرفیت محدود</option><option value="full">تکمیل ظرفیت</option></select><select aria-label="دسته کلاس" name="category" defaultValue={categoryQuery} className="h-10 rounded-lg border bg-white px-2 text-sm"><option value="">همه دسته‌ها</option>{categories.map(item => <option key={item}>{item}</option>)}</select><select aria-label="مدرس" name="instructor" defaultValue={instructorQuery} className="h-10 rounded-lg border bg-white px-2 text-sm"><option value="">همه مدرس‌ها</option>{instructors.filter(item => item.active !== false).map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select><select aria-label="بازه زمانی" name="scope" defaultValue={scopeQuery} className="h-10 rounded-lg border bg-white px-2 text-sm"><option value="">همه زمان‌ها</option><option value="current">این ماه</option><option value="next">ماه آینده</option></select><button className="h-10 rounded-lg bg-navy-800 px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">اعمال فیلتر</button></form>
    <div className="mt-5 flex items-center gap-2"><Link href={queryHref(q, { view: "list", year: undefined, month: undefined })} className={`rounded-lg px-4 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${view === "list" ? "bg-navy-800 text-white" : "bg-sand-100"}`}>لیست</Link><Link href={queryHref(q, { view: "calendar", year, month })} className={`rounded-lg px-4 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${view === "calendar" ? "bg-navy-800 text-white" : "bg-sand-100"}`}>تقویم</Link></div>
    {view === "list" ? <ScheduleList rows={classes} /> : <section className="mt-6 overflow-hidden rounded-2xl border border-navy-900/10 bg-card"><header className="flex items-center justify-between gap-3 border-b border-navy-900/10 p-3 sm:p-4"><Link aria-label="ماه قبل" href={queryHref(q, { view: "calendar", year: previous.year, month: previous.month })} className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:px-3 sm:text-sm"><ChevronRight className="h-4 w-4" aria-hidden /> ماه قبل</Link><div className="text-center"><h2 className="font-black text-navy-900">{JALALI_MONTHS[month - 1]} {toPersianDigits(year)}</h2>{!holidayMetadata.available ? <p className="mt-0.5 text-[10px] text-ink-500">اطلاعات تعطیلات این سال در دسترس نیست</p> : null}</div><Link aria-label="ماه بعد" href={queryHref(q, { view: "calendar", year: next.year, month: next.month })} className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:px-3 sm:text-sm">ماه بعد <ChevronLeft className="h-4 w-4" aria-hidden /></Link></header>
      <div className="hidden md:block"><div className="grid grid-cols-7 bg-sand-50 text-center text-xs font-bold text-ink-600">{["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"].map((name, index) => <div key={name} className={`border-l border-navy-900/10 p-2.5 last:border-l-0 ${index === 6 ? "text-madder-700" : ""}`}>{name}{index === 6 ? <span className="sr-only">، پایان هفته</span> : null}</div>)}</div><div className="grid grid-cols-7 gap-px bg-navy-900/10" data-calendar-grid>{grid.map(cell => { const dayEvents = eventsByDate.get(cell.date) ?? []; const holiday = cell.inCurrentMonth ? holidays.get(cell.day) : undefined; const isToday = cell.inCurrentMonth && cell.date === today; return <article key={cell.date} aria-label={`${cell.year}/${cell.month}/${cell.day}${cell.isFriday ? "، جمعه" : ""}${holiday ? `، تعطیل رسمی: ${holiday.name}` : ""}`} className={`min-h-32 min-w-0 bg-white p-2 ${cell.inCurrentMonth ? "" : "bg-sand-50/80 text-ink-400"} ${holiday ? "bg-madder-50/35" : ""}`}><div className="flex items-start justify-between gap-1"><span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg text-xs font-black ${isToday ? "bg-teal-700 text-white" : cell.isFriday ? "text-madder-700" : "text-navy-900"}`}>{toPersianDigits(cell.day)}</span>{isToday ? <span className="text-[10px] font-bold text-teal-800">امروز</span> : null}</div>{holiday ? <p className="mt-1 rounded-md bg-madder-50 px-1.5 py-1 text-[10px] font-bold leading-4 text-madder-800"><span className="block">تعطیل رسمی</span>{holiday.name}</p> : null}<div className="mt-1.5 space-y-1">{dayEvents.slice(0, 3).map(event => <CalendarEventChip key={event.id} event={event} />)}{dayEvents.length > 3 ? <details className="text-[10px]"><summary className="cursor-pointer rounded px-1 py-1 font-bold text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">+ {toPersianDigits(dayEvents.length - 3)} مورد دیگر</summary><div className="mt-1 space-y-1">{dayEvents.slice(3).map(event => <CalendarEventChip key={event.id} event={event} />)}</div></details> : null}</div></article>; })}</div></div>
      <div className="space-y-2 p-3 md:hidden" data-mobile-calendar>{grid.filter(cell => cell.inCurrentMonth && ((eventsByDate.get(cell.date)?.length ?? 0) > 0 || holidays.has(cell.day) || cell.date === today)).map(cell => { const dayEvents = eventsByDate.get(cell.date) ?? []; const holiday = holidays.get(cell.day); return <article key={cell.date} className="rounded-xl border border-navy-900/10 bg-[#fffdf8] p-3"><header className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-navy-900">{toPersianDigits(cell.day)} {JALALI_MONTHS[cell.month - 1]}</p>{cell.date === today ? <span className="text-xs font-bold text-teal-800">امروز</span> : null}</div>{holiday ? <span className="max-w-[65%] rounded-lg bg-madder-50 px-2 py-1 text-left text-[10px] font-bold leading-4 text-madder-800">تعطیل رسمی · {holiday.name}</span> : cell.isFriday ? <span className="text-xs font-bold text-madder-700">جمعه</span> : null}</header>{dayEvents.length ? <div className="mt-2 space-y-1.5">{dayEvents.map(event => <CalendarEventChip key={event.id} event={event} mobile />)}</div> : <p className="mt-2 text-xs text-ink-500">کلاسی برای این روز ثبت نشده است.</p>}</article>; })}{!monthHasEvents ? <p className="rounded-xl bg-sand-50 p-5 text-center text-sm text-ink-600">{filtersActive ? "کلاسی مطابق فیلترهای انتخاب‌شده در این ماه پیدا نشد." : "در این ماه کلاس ثبت‌شده‌ای وجود ندارد."}</p> : null}</div>
      {!monthHasEvents ? <p className="hidden border-t border-navy-900/10 bg-sand-50/70 p-4 text-center text-sm text-ink-600 md:block">{filtersActive ? "کلاسی مطابق فیلترهای انتخاب‌شده در این ماه پیدا نشد." : "در این ماه کلاس ثبت‌شده‌ای وجود ندارد."}</p> : null}
    </section>}
  </main>;
}

function CalendarEventChip({ event, mobile = false }: { event: ClassCalendarEvent; mobile?: boolean }) {
  const tone = event.status === "cancelled" ? "border-madder-200 bg-madder-50 text-madder-800 line-through" : event.status === "postponed" ? "border-ochre-300 bg-ochre-50 text-ochre-900" : event.status === "completed" ? "border-ink-200 bg-sand-100 text-ink-600" : event.type === "class-start" ? "border-teal-700 bg-navy-900 text-white" : "border-teal-100 bg-teal-50 text-teal-900";
  const detail = `${event.classTitle}؛ ${event.instructors.join("، ") || "مدرس ثبت نشده"}${event.time ? `؛ ${event.time}` : ""}؛ ${sessionLabels[event.status]}`;
  return <Link href={event.href} title={detail} className={`block rounded-lg border px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${tone}`}><span className={`${mobile ? "text-xs" : "text-[10px]"} block font-bold leading-4 line-clamp-2`}>{event.title}</span><span className={`${mobile ? "text-[11px]" : "text-[9px]"} mt-0.5 block opacity-80`}>{sessionLabels[event.status]}{event.time ? ` · ${toPersianDigits(event.time)}` : ""}</span>{mobile ? <span className="mt-0.5 block text-[10px] opacity-75">{event.instructors.join("، ")} · {toPersianDigits(event.remaining)} ظرفیت باقی‌مانده</span> : null}</Link>;
}

function ScheduleList({ rows }: { rows: { item: ReturnType<typeof getClasses>[number]; status: ClassScheduleStatus; category: string; instructorNames: string[] }[] }) {
  return <section className="mt-6 grid gap-4 lg:grid-cols-2">{rows.length ? rows.map(({ item, status, category, instructorNames }) => { const remaining = availableSeats(item); return <article key={item.slug} className="rounded-2xl border border-ink-900/10 bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-ochre-700">{category}</p><h2 className="mt-1 text-lg font-black text-navy-900">{item.title}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[status]}`}>{classScheduleStatusLabels[status]}</span></div><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><Info icon={CalendarDays} text={formatJalaliDateLong(item.startDate)} /><Info icon={Clock3} text={`${item.days}، ${item.time}`} /><Info icon={Users} text={instructorNames.join("، ") || item.instructor} /><Info icon={MapPin} text={`${toPersianDigits(item.sessions)} جلسه • ${toPersianDigits(remaining)} ظرفیت باقی‌مانده`} /></dl><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><strong className="text-navy-900">{formatPrice(item.price)}</strong><div className="flex gap-2"><Link href={`/classes/${item.slug}`} className="rounded-lg border px-4 py-2 text-sm font-bold">جزئیات</Link>{status === "open" || status === "limited" ? <Link href={`/classes/${item.slug}#register`} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white">ثبت‌نام</Link> : null}</div></div></article>; }) : <p className="rounded-xl bg-sand-50 p-8 text-center text-ink-500 lg:col-span-2">کلاسی مطابق فیلترهای انتخاب‌شده پیدا نشد.</p>}</section>;
}

function Info({ icon: Icon, text }: { icon: typeof CalendarDays; text: string }) { return <div className="flex items-center gap-2 text-ink-600"><Icon className="h-4 w-4 shrink-0 text-teal-700" aria-hidden /><span>{text}</span></div>; }
