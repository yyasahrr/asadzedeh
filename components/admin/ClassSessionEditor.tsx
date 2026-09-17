"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ClassSession, ClassSessionStatus } from "@/lib/types";
import { JalaliDatePicker } from "./JalaliDatePicker";

const labels: Record<ClassSessionStatus, string> = { scheduled: "برنامه‌ریزی‌شده", completed: "برگزارشده", cancelled: "لغوشده", postponed: "به‌تعویق‌افتاده" };
const blank = (): ClassSession => ({ id: `draft-${crypto.randomUUID()}`, date: "", startTime: "16:00", endTime: "19:00", status: "scheduled" });

export function ClassSessionEditor({ initial = [] }: { initial?: ClassSession[] }) {
  const [sessions, setSessions] = useState<ClassSession[]>(initial);
  const update = (index: number, patch: Partial<ClassSession>) => setSessions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  return (
    <section className="space-y-3 sm:col-span-2" aria-labelledby="session-editor-title">
      <input type="hidden" name="sessionSchedule" value={JSON.stringify(sessions)} />
      <div className="flex items-center justify-between gap-3"><div><h2 id="session-editor-title" className="font-black text-navy-900">برنامه جلسات</h2><p className="text-xs text-ink-500">تاریخ شروع کلاس از اولین جلسه محاسبه می‌شود.</p></div><button type="button" onClick={() => setSessions((current) => [...current, blank()])} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" /> افزودن جلسه</button></div>
      {sessions.map((session, index) => (
        <div key={session.id} className="grid min-w-0 gap-3 rounded-xl border border-ink-900/10 bg-sand-50 p-3 sm:grid-cols-2 lg:grid-cols-[auto_1.2fr_0.7fr_0.7fr_1fr_1fr_auto] lg:items-end">
          <span className="self-center text-xs font-black text-ink-500">جلسه {index + 1}</span>
          <label className="min-w-0 text-xs font-bold text-ink-600">تاریخ<JalaliDatePicker value={session.date} onChange={(date) => update(index, { date })} /></label>
          <label className="text-xs font-bold text-ink-600">شروع<input type="time" value={session.startTime} onChange={(event) => update(index, { startTime: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-ink-900/10 bg-card px-2" /></label>
          <label className="text-xs font-bold text-ink-600">پایان<input type="time" value={session.endTime} onChange={(event) => update(index, { endTime: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-ink-900/10 bg-card px-2" /></label>
          <label className="text-xs font-bold text-ink-600">عنوان<input value={session.title ?? ""} maxLength={120} onChange={(event) => update(index, { title: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-ink-900/10 bg-card px-3" /></label>
          <label className="text-xs font-bold text-ink-600">وضعیت<select value={session.status} onChange={(event) => update(index, { status: event.target.value as ClassSessionStatus })} className="mt-1 h-11 w-full rounded-xl border border-ink-900/10 bg-card px-2">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button type="button" aria-label={`حذف جلسه ${index + 1}`} onClick={() => { if (confirm("این جلسه حذف شود؟")) setSessions((current) => current.filter((_, itemIndex) => itemIndex !== index)); }} className="flex h-11 w-11 items-center justify-center rounded-xl text-madder-700 hover:bg-madder-50"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      {sessions.length === 0 ? <p className="rounded-xl border border-dashed border-ink-900/15 p-4 text-center text-sm text-ink-500">هنوز جلسه‌ای تعریف نشده است.</p> : null}
    </section>
  );
}
