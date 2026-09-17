"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { gregorianToJalali, jalaliToGregorian, JALALI_MONTHS, parseStoredDate, toPersianDigits } from "@/lib/jalali-date";

export function JalaliDatePicker({ name, value = "", onChange, id }: { name?: string; value?: string; onChange?: (value: string) => void; id?: string }) {
  const initial = gregorianToJalali(value) ?? "1405/01/01";
  const [year, setYear] = useState(Number(initial.slice(0, 4)));
  const [month, setMonth] = useState(Number(initial.slice(5, 7)));
  const [day, setDay] = useState(Number(initial.slice(8, 10)));
  const [stored, setStored] = useState(parseStoredDate(value) ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const select = () => {
    const iso = jalaliToGregorian(`${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`);
    if (!iso) return;
    setStored(iso);
    onChange?.(iso);
    setOpen(false);
  };
  const displayed = stored ? gregorianToJalali(stored) : null;

  return (
    <div ref={rootRef} className="relative min-w-0">
      {name ? <input type="hidden" name={name} value={stored} /> : null}
      <button id={id} type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="flex h-11 w-full items-center justify-between rounded-xl border border-ink-900/10 bg-card px-4 text-sm focus-visible:ring-2 focus-visible:ring-teal-600">
        <span>{displayed ? toPersianDigits(displayed) : "انتخاب تاریخ"}</span><CalendarDays className="h-4 w-4 text-teal-700" />
      </button>
      {open ? (
        <div role="dialog" aria-label="انتخاب تاریخ شمسی" className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(19rem,calc(100vw-2rem))] rounded-xl bg-card p-3 shadow-lift ring-1 ring-ink-900/10">
          <div className="grid grid-cols-3 gap-2" dir="rtl">
            <label className="text-xs font-bold text-ink-600">سال<select aria-label="سال" value={year} onChange={(event) => setYear(Number(event.target.value))} className="mt-1 h-11 w-full rounded-lg border border-ink-900/10 bg-white px-2">{Array.from({ length: 21 }, (_, index) => 1395 + index).map((item) => <option key={item} value={item}>{toPersianDigits(item)}</option>)}</select></label>
            <label className="text-xs font-bold text-ink-600">ماه<select aria-label="ماه" value={month} onChange={(event) => setMonth(Number(event.target.value))} className="mt-1 h-11 w-full rounded-lg border border-ink-900/10 bg-white px-1">{JALALI_MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
            <label className="text-xs font-bold text-ink-600">روز<select aria-label="روز" value={day} onChange={(event) => setDay(Number(event.target.value))} className="mt-1 h-11 w-full rounded-lg border border-ink-900/10 bg-white px-2">{Array.from({ length: 31 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>{toPersianDigits(item)}</option>)}</select></label>
          </div>
          <button type="button" onClick={select} className="mt-3 h-11 w-full rounded-lg bg-navy-800 text-sm font-bold text-white">ثبت تاریخ</button>
        </div>
      ) : null}
    </div>
  );
}
