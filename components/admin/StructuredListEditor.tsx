"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

export interface EditorField { key: string; label: string; kind?: "text" | "textarea" | "number" | "checkbox" | "select"; options?: { value: string; label: string }[]; min?: number; max?: number }
type Row = { id: string; order: number };

export function reorderItems<T extends Row>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((item, order) => ({ ...item, order }));
}

export function ReorderControls({ index, count, onMove }: { index: number; count: number; onMove: (delta: -1 | 1) => void }) {
  return <div className="flex gap-2" role="group" aria-label="تغییر ترتیب">
    <button type="button" aria-label="انتقال به بالا" onClick={() => onMove(-1)} disabled={index === 0} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border bg-white p-2 disabled:cursor-not-allowed disabled:opacity-30"><ArrowUp className="h-4 w-4" aria-hidden /></button>
    <button type="button" aria-label="انتقال به پایین" onClick={() => onMove(1)} disabled={index === count - 1} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border bg-white p-2 disabled:cursor-not-allowed disabled:opacity-30"><ArrowDown className="h-4 w-4" aria-hidden /></button>
  </div>;
}

export function StructuredListEditor<T extends Row>({ title, items, fields, max, create, onChange }: { title: string; items: T[]; fields: EditorField[]; max: number; create: () => Row & object; onChange: (items: T[]) => void }) {
  const update = (index: number, key: string, value: unknown) => onChange(items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const read = (item: T, key: string) => Reflect.get(item, key);
  const add = () => onChange([...items, { ...create(), order: items.length } as T]);
  return <fieldset className="space-y-3 rounded-xl border border-ink-900/10 p-4"><div className="flex items-center justify-between gap-3"><legend className="font-black text-navy-900">{title}</legend><button type="button" disabled={items.length >= max} onClick={add} className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-xs font-bold"><Plus className="h-4 w-4" /> افزودن</button></div>{items.length === 0 ? <p className="rounded-lg bg-sand-50 p-4 text-sm text-ink-500">موردی ثبت نشده است.</p> : items.map((item, index) => <div key={item.id} className="grid gap-3 rounded-xl bg-sand-50 p-3 sm:grid-cols-2">{fields.map(field => <label key={field.key} className={field.kind === "textarea" ? "sm:col-span-2" : ""}><span className="mb-1 block text-xs font-bold text-ink-600">{field.label}</span>{field.kind === "checkbox" ? <input type="checkbox" checked={Boolean(read(item, field.key))} onChange={e => update(index, field.key, e.target.checked)} /> : field.kind === "textarea" ? <textarea value={String(read(item, field.key) ?? "")} onChange={e => update(index, field.key, e.target.value)} className="min-h-20 w-full rounded-lg border bg-white p-2 text-sm" /> : field.kind === "select" ? <select value={String(read(item, field.key) ?? "")} onChange={e => update(index, field.key, e.target.value)} className="h-10 w-full rounded-lg border bg-white px-2 text-sm">{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input type={field.kind === "number" ? "number" : "text"} min={field.min} max={field.max} value={String(read(item, field.key) ?? "")} onChange={e => update(index, field.key, field.kind === "number" ? Number(e.target.value) : e.target.value)} className="h-10 w-full rounded-lg border bg-white px-2 text-sm" />}</label>)}<div className="flex flex-wrap items-center gap-2 sm:col-span-2"><ReorderControls index={index} count={items.length} onMove={delta => onChange(reorderItems(items, index, delta))} /><button type="button" onClick={() => onChange(items.filter((_, i) => i !== index).map((x, order) => ({ ...x, order })))} className="mr-auto inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-xs font-bold text-madder-700"><Trash2 className="h-4 w-4" /> حذف</button></div></div>)}</fieldset>;
}
