"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { gregorianToJalali, jalaliSelectionToStoredDate, jalaliToGregorian, JALALI_MONTHS, parseStoredDate, toPersianDigits } from "@/lib/jalali-date";

const WEEKDAYS = ["شنبه", "یک", "دو", "سه", "چهار", "پنج", "جمعه"] as const;

function parseJalaliParts(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("/").map(Number);
  return { year, month, day };
}

function monthDays(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return jalaliToGregorian(`${year}/12/30`) ? 30 : 29;
}

function firstDayOffset(year: number, month: number): number {
  const iso = jalaliToGregorian(`${year}/${String(month).padStart(2, "0")}/01`);
  if (!iso) return 0;
  const [gy, gm, gd] = iso.split("-").map(Number);
  return (new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay() + 1) % 7;
}

export function JalaliDatePicker({ name, value = "", onChange, id }: {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  id?: string;
}) {
  const initialStored = parseStoredDate(value) ?? "";
  const initialParts = parseJalaliParts(gregorianToJalali(initialStored) ?? "1405/01/01");
  const [view, setView] = useState({ year: initialParts.year, month: initialParts.month });
  const [stored, setStored] = useState(initialStored);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const selected = stored ? parseJalaliParts(gregorianToJalali(stored)!) : null;
  const years = Array.from({ length: 21 }, (_, index) => view.year - 10 + index);
  const count = monthDays(view.year, view.month);
  const offset = firstDayOffset(view.year, view.month);

  const moveMonth = (delta: number) => {
    setView((current) => {
      const month = current.month + delta;
      if (month < 1) return { year: current.year - 1, month: 12 };
      if (month > 12) return { year: current.year + 1, month: 1 };
      return { year: current.year, month };
    });
  };

  const selectDay = (day: number) => {
    const iso = jalaliSelectionToStoredDate(view.year, view.month, day);
    if (!iso) return;
    setStored(iso);
    onChange?.(iso);
    setOpen(false);
  };
  const displayed = stored ? gregorianToJalali(stored) : null;

  return (
    <div ref={rootRef} className="relative min-w-0" dir="rtl">
      {name ? <input type="hidden" name={name} value={stored} /> : null}
      <button id={id} type="button" onClick={() => setOpen((current) => !current)} aria-haspopup="dialog" aria-expanded={open} className="flex h-11 w-full items-center justify-between rounded-xl border border-ink-900/10 bg-card px-4 text-sm text-navy-900 outline-none transition hover:border-teal-700/35 focus-visible:ring-2 focus-visible:ring-teal-600">
        <span>{displayed ? toPersianDigits(displayed) : value || "انتخاب تاریخ"}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
      </button>
      {open ? (
        <div role="dialog" aria-modal="false" aria-label="انتخاب تاریخ شمسی" className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-card p-3 shadow-lift ring-1 ring-ink-900/10">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="ماه قبل" className="grid h-10 w-10 place-items-center rounded-lg text-ink-600 hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-teal-600"><ChevronRight className="h-4 w-4" /></button>
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_5.5rem] gap-2">
              <select aria-label="ماه شمسی" value={view.month} onChange={(event) => setView((current) => ({ ...current, month: Number(event.target.value) }))} className="h-10 min-w-0 rounded-lg border border-ink-900/10 bg-white px-2 text-sm font-bold">
                {JALALI_MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
              </select>
              <select aria-label="سال شمسی" value={view.year} onChange={(event) => setView((current) => ({ ...current, year: Number(event.target.value) }))} className="h-10 rounded-lg border border-ink-900/10 bg-white px-2 text-sm font-bold">
                {years.map((year) => <option key={year} value={year}>{toPersianDigits(year)}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => moveMonth(1)} aria-label="ماه بعد" className="grid h-10 w-10 place-items-center rounded-lg text-ink-600 hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-teal-600"><ChevronLeft className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center" aria-hidden>
            {WEEKDAYS.map((weekday) => <span key={weekday} className="py-1 text-xs font-bold text-ink-500">{weekday}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`${JALALI_MONTHS[view.month - 1]} ${toPersianDigits(view.year)}`}>
            {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} aria-hidden />)}
            {Array.from({ length: count }, (_, index) => index + 1).map((day) => {
              const active = selected?.year === view.year && selected.month === view.month && selected.day === day;
              return <button key={day} type="button" role="gridcell" aria-label={`${toPersianDigits(day)} ${JALALI_MONTHS[view.month - 1]} ${toPersianDigits(view.year)}`} aria-selected={active} onClick={() => selectDay(day)} className={`h-10 rounded-lg text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-teal-600 ${active ? "bg-navy-800 text-white" : "text-ink-700 hover:bg-sand-100"}`}>{toPersianDigits(day)}</button>;
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
