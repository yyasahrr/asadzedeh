import Link from "next/link";
import type { Article } from "@/lib/types";
import { galleryImages } from "@/lib/seed";
import { FieldLabel, Input, Select, Textarea } from "../ui/Input";
import { UploadField } from "./UploadField";

const categories = ["رنگ‌شناسی", "راهنمای خرید", "شناخت بافت", "بازار فرش", "دانشنامه"];

export function ArticleForm({
  action,
  initial,
  submitLabel,
}: {
  action: (fd: FormData) => void;
  initial?: Article | null;
  submitLabel: string;
}) {
  const a = initial ?? null;
  return (
    <form action={action} className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
      {a && <input type="hidden" name="slug" value={a.slug} />}
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="b-title">عنوان مقاله *</FieldLabel>
        <Input id="b-title" name="title" required defaultValue={a?.title} />
      </div>
      <div>
        <FieldLabel htmlFor="b-cat">دسته</FieldLabel>
        <Select id="b-cat" name="category" defaultValue={a?.category ?? categories[4]}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="b-min">زمان مطالعه (دقیقه)</FieldLabel>
        <Input id="b-min" name="minutes" inputMode="numeric" defaultValue={a?.minutes ?? 5} />
      </div>
      <div className="sm:col-span-2">
        <UploadField name="image" label="تصویر شاخص" gallery={galleryImages} initial={a?.image} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="b-excerpt">خلاصه</FieldLabel>
        <Textarea id="b-excerpt" name="excerpt" defaultValue={a?.excerpt} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="b-body">متن مقاله (هر پاراگراف با یک خط خالی جدا شود)</FieldLabel>
        <Textarea id="b-body" name="body" defaultValue={a?.body.join("\n\n")} className="min-h-56" />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 text-[15px] font-bold text-white transition-colors hover:bg-navy-700">
          {submitLabel}
        </button>
        <Link href="/admin/blog" className="inline-flex h-11 items-center rounded-xl bg-sand-200 px-6 text-sm font-bold text-ink-700 transition-colors hover:bg-sand-300">
          انصراف
        </Link>
      </div>
    </form>
  );
}
