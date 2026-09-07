"use client";

import { useState } from "react";
import { FieldLabel, Input, Select, Textarea } from "../ui/Input";
import { UploadField } from "../admin/UploadField";
import { galleryImages } from "@/lib/seed";

const categories = ["فرش‌بافی", "گلیم‌بافی", "گبه‌بافی", "رنگرزی", "مرمت", "طراحی"];
const levels = ["مقدماتی", "متوسط", "پیشرفته", "همه سطوح"];

interface CourseRequestFormProps {
  action: (fd: FormData) => void;
  submitLabel: string;
  initialValues?: {
    title?: string;
    shortTitle?: string;
    category?: string;
    level?: string;
    sessions?: number;
    hours?: number;
    price?: number;
    oldPrice?: number;
    image?: string;
    excerpt?: string;
    outcomes?: string[];
    syllabus?: { title: string; lessons: string[] }[];
    badge?: string;
  };
}

export function CourseRequestForm({ action, submitLabel, initialValues }: CourseRequestFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    action(fd);
  };

  return (
    <form onSubmit={(e) => { handleSubmit(e); }} className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="f-title">عنوان کامل دوره *</FieldLabel>
        <Input id="f-title" name="title" required defaultValue={initialValues?.title} placeholder="مثلاً: گلیم‌بافی از صفر؛ هنر بافت بدون گره" />
      </div>
      <div>
        <FieldLabel htmlFor="f-short">عنوان کوتاه</FieldLabel>
        <Input id="f-short" name="shortTitle" defaultValue={initialValues?.shortTitle} placeholder="مثلاً: گلیم‌بافی مقدماتی" />
      </div>
      <div>
        <FieldLabel htmlFor="f-badge">نشان (اختیاری)</FieldLabel>
        <Input id="f-badge" name="badge" defaultValue={initialValues?.badge} placeholder="مثلاً: جدید، پرفروش‌ترین" />
      </div>
      <div>
        <FieldLabel htmlFor="f-cat">دسته</FieldLabel>
        <Select id="f-cat" name="category" defaultValue={initialValues?.category ?? categories[0]}>
          {categories.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="f-level">سطح</FieldLabel>
        <Select id="f-level" name="level" defaultValue={initialValues?.level ?? levels[0]}>
          {levels.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </Select>
      </div>

      <div className="sm:col-span-2">
        <UploadField name="image" label="تصویر دوره" gallery={galleryImages} initial={initialValues?.image} />
      </div>

      <div>
        <FieldLabel htmlFor="f-sessions">تعداد جلسات</FieldLabel>
        <Input id="f-sessions" name="sessions" inputMode="numeric" defaultValue={initialValues?.sessions ?? 12} />
      </div>
      <div>
        <FieldLabel htmlFor="f-hours">ساعت آموزش</FieldLabel>
        <Input id="f-hours" name="hours" inputMode="numeric" defaultValue={initialValues?.hours ?? 10} />
      </div>
      <div>
        <FieldLabel htmlFor="f-price">قیمت (تومان)</FieldLabel>
        <Input id="f-price" name="price" inputMode="numeric" defaultValue={initialValues?.price} placeholder="۰ برای دوره رایگان" dir="ltr" className="text-left" />
      </div>
      <div>
        <FieldLabel htmlFor="f-old">قیمت قبل از تخفیف (اختیاری)</FieldLabel>
        <Input id="f-old" name="oldPrice" inputMode="numeric" defaultValue={initialValues?.oldPrice ?? ""} dir="ltr" className="text-left" />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel htmlFor="f-excerpt">معرفی کوتاه</FieldLabel>
        <Textarea id="f-excerpt" name="excerpt" defaultValue={initialValues?.excerpt} placeholder="دو سه جمله درباره این دوره…" />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="f-outcomes">دستاوردها (هر خط یک مورد)</FieldLabel>
        <Textarea id="f-outcomes" name="outcomes" defaultValue={initialValues?.outcomes?.join("\n")} placeholder={"چله‌کشی صحیح دار قالی\nاجرای گره فارسی و ترکی"} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="f-syllabus">سرفصل‌ها (هر خط: عنوان فصل: درس۱؛ درس۲)</FieldLabel>
        <Textarea
          id="f-syllabus"
          name="syllabus"
          defaultValue={initialValues?.syllabus?.map((s) => `${s.title}: ${s.lessons.join("؛ ")}`).join("\n")}
          placeholder={"شروع بافت: چله‌کشی ساده؛ پودگذاری و دفتین\nتکنیک‌های پایه: پودنمای ساده؛ راه‌راه و جناقی"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 text-[15px] font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
        >
          {submitting ? "در حال ارسال..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
