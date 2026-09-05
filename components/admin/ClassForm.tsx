import Link from "next/link";
import type { InPersonClass } from "@/lib/types";
import { galleryImages } from "@/lib/seed";
import { getInstructors, getVideos } from "@/lib/store";
import { FieldLabel, Input, Select, Textarea } from "../ui/Input";
import { UploadField } from "./UploadField";
import { TrailerFields } from "./TrailerFields";

export function ClassForm({
  action,
  initial,
  submitLabel,
}: {
  action: (fd: FormData) => void;
  initial?: InPersonClass | null;
  submitLabel: string;
}) {
  const c = initial ?? null;
  const instructors = getInstructors().filter((i) => i.active !== false || i.slug === c?.instructorSlug);
  const videos = getVideos().map((v) => ({ id: v.id, title: v.title, durationSec: v.durationSec, status: v.status }));
  const defaultInstructor = c?.instructorSlug ?? instructors.find((i) => i.name === c?.instructor)?.slug ?? instructors[0]?.slug ?? "";
  return (
    <form action={action} className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
      {c && <input type="hidden" name="slug" value={c.slug} />}

      <div className="sm:col-span-2">
        <FieldLabel htmlFor="k-title">عنوان کلاس *</FieldLabel>
        <Input id="k-title" name="title" required defaultValue={c?.title} placeholder="مثلاً: گلیم‌بافی مقدماتی (حضوری)" />
      </div>
      <div>
        <FieldLabel htmlFor="k-inst">مدرس</FieldLabel>
        <Select id="k-inst" name="instructorSlug" defaultValue={defaultInstructor}>
          {instructors.map((i) => (
            <option key={i.slug} value={i.slug}>{i.name} — {i.specialty}</option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <UploadField name="image" label="تصویر کلاس" gallery={galleryImages} initial={c?.image} />
      </div>
      <div>
        <FieldLabel htmlFor="k-start">تاریخ شروع</FieldLabel>
        <Input id="k-start" name="startDate" defaultValue={c?.startDate} placeholder="مثلاً: ۲۵ مهر" />
      </div>
      <div>
        <FieldLabel htmlFor="k-days">روزها</FieldLabel>
        <Input id="k-days" name="days" defaultValue={c?.days} placeholder="مثلاً: شنبه و دوشنبه" />
      </div>
      <div>
        <FieldLabel htmlFor="k-time">ساعت</FieldLabel>
        <Input id="k-time" name="time" defaultValue={c?.time} placeholder="مثلاً: ۱۶:۰۰ تا ۱۹:۰۰" />
      </div>
      <div>
        <FieldLabel htmlFor="k-loc">محل برگزاری</FieldLabel>
        <Input id="k-loc" name="location" defaultValue={c?.location ?? "کارگاه اسدزاده، ارومیه"} />
      </div>
      <div>
        <FieldLabel htmlFor="k-sessions">تعداد جلسات</FieldLabel>
        <Input id="k-sessions" name="sessions" inputMode="numeric" defaultValue={c?.sessions ?? 8} />
      </div>
      <div>
        <FieldLabel htmlFor="k-price">شهریه (تومان) *</FieldLabel>
        <Input id="k-price" name="price" required inputMode="numeric" defaultValue={c?.price} dir="ltr" className="text-left" />
      </div>
      <div>
        <FieldLabel htmlFor="k-cap">ظرفیت کل</FieldLabel>
        <Input id="k-cap" name="capacity" inputMode="numeric" defaultValue={c?.capacity ?? 10} />
      </div>
      {c && (
        <div>
          <FieldLabel htmlFor="k-rem">ظرفیت باقی‌مانده</FieldLabel>
          <Input id="k-rem" name="remaining" inputMode="numeric" defaultValue={c.remaining} />
        </div>
      )}
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="k-excerpt">معرفی کوتاه</FieldLabel>
        <Textarea id="k-excerpt" name="excerpt" defaultValue={c?.excerpt} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="k-inc">شهریه شامل (هر خط یک مورد)</FieldLabel>
        <Textarea id="k-inc" name="includes" defaultValue={c?.includes.join("\n")} placeholder={"دار و ابزار در کارگاه\nگواهی پایان دوره"} />
      </div>

      <TrailerFields initial={c?.trailer} videos={videos} gallery={galleryImages} />

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 text-[15px] font-bold text-white transition-colors hover:bg-navy-700">
          {submitLabel}
        </button>
        <Link href="/admin/classes" className="inline-flex h-11 items-center rounded-xl bg-sand-200 px-6 text-sm font-bold text-ink-700 transition-colors hover:bg-sand-300">
          انصراف
        </Link>
      </div>
    </form>
  );
}
