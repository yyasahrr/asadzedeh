import Link from "next/link";
import type { OnlineCourse } from "@/lib/types";
import { galleryImages } from "@/lib/seed";
import { getInstructors, getSettings, getVideos } from "@/lib/store";
import { findFfmpeg } from "@/lib/video";
import { spotPlayerConfigured } from "@/lib/spotplayer";
import { FieldLabel, Input, Select, Textarea } from "../ui/Input";
import { UploadField } from "./UploadField";
import { TrailerFields } from "./TrailerFields";
import { ProtectionFields } from "./ProtectionFields";

const categories = ["فرش‌بافی", "گلیم‌بافی", "گبه‌بافی", "رنگرزی", "مرمت", "طراحی"];
const levels = ["مقدماتی", "متوسط", "پیشرفته"];

export function CourseForm({
  action,
  initial,
  submitLabel,
}: {
  action: (fd: FormData) => void;
  initial?: OnlineCourse | null;
  submitLabel: string;
}) {
  const c = initial ?? null;
  const instructors = getInstructors().filter((i) => i.active !== false || i.slug === c?.instructorSlug);
  const videos = getVideos().map((v) => ({ id: v.id, title: v.title, durationSec: v.durationSec, status: v.status }));
  const protection = c?.protection ?? getSettings().video.defaults;
  const defaultInstructor = c?.instructorSlug ?? instructors.find((i) => i.name === c?.instructor)?.slug ?? instructors[0]?.slug ?? "";
  return (
    <form action={action} className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
      {c && <input type="hidden" name="slug" value={c.slug} />}

      <div className="sm:col-span-2">
        <FieldLabel htmlFor="f-title">عنوان کامل دوره *</FieldLabel>
        <Input id="f-title" name="title" required defaultValue={c?.title} placeholder="مثلاً: گلیم‌بافی از صفر؛ هنر بافت بدون گره" />
      </div>
      <div>
        <FieldLabel htmlFor="f-short">عنوان کوتاه</FieldLabel>
        <Input id="f-short" name="shortTitle" defaultValue={c?.shortTitle} placeholder="مثلاً: گلیم‌بافی مقدماتی" />
      </div>
      <div>
        <FieldLabel htmlFor="f-badge">نشان (اختیاری)</FieldLabel>
        <Input id="f-badge" name="badge" defaultValue={c?.badge} placeholder="مثلاً: جدید، پرفروش‌ترین" />
      </div>
      <div>
        <FieldLabel htmlFor="f-cat">دسته</FieldLabel>
        <Select id="f-cat" name="category" defaultValue={c?.category ?? categories[0]}>
          {categories.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="f-level">سطح</FieldLabel>
        <Select id="f-level" name="level" defaultValue={c?.level ?? levels[0]}>
          {levels.map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="f-inst">مدرس</FieldLabel>
        <Select id="f-inst" name="instructorSlug" defaultValue={defaultInstructor}>
          {instructors.map((i) => (
            <option key={i.slug} value={i.slug}>{i.name} — {i.specialty}</option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-ink-500">
          مدرس جدید را از <Link href="/admin/instructors" className="font-bold text-teal-700">بخش مدرسان</Link> اضافه کنید.
        </p>
      </div>
      <div className="sm:col-span-2">
        <UploadField name="image" label="تصویر دوره" gallery={galleryImages} initial={c?.image} />
      </div>
      <div>
        <FieldLabel htmlFor="f-sessions">تعداد جلسات</FieldLabel>
        <Input id="f-sessions" name="sessions" inputMode="numeric" defaultValue={c?.sessions ?? 12} />
      </div>
      <div>
        <FieldLabel htmlFor="f-hours">ساعت آموزش</FieldLabel>
        <Input id="f-hours" name="hours" inputMode="numeric" defaultValue={c?.hours ?? 10} />
      </div>
      <div>
        <FieldLabel htmlFor="f-price">قیمت (تومان) *</FieldLabel>
        <Input id="f-price" name="price" required inputMode="numeric" defaultValue={c?.price} placeholder="مثلاً: 2850000" dir="ltr" className="text-left" />
      </div>
      <div>
        <FieldLabel htmlFor="f-old">قیمت قبل از تخفیف (اختیاری)</FieldLabel>
        <Input id="f-old" name="oldPrice" inputMode="numeric" defaultValue={c?.oldPrice ?? ""} dir="ltr" className="text-left" />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel htmlFor="f-excerpt">معرفی کوتاه</FieldLabel>
        <Textarea id="f-excerpt" name="excerpt" defaultValue={c?.excerpt} placeholder="دو سه جمله درباره این دوره…" />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="f-outcomes">دستاوردها (هر خط یک مورد)</FieldLabel>
        <Textarea id="f-outcomes" name="outcomes" defaultValue={c?.outcomes.join("\n")} placeholder={"چله‌کشی صحیح دار قالی\nاجرای گره فارسی و ترکی"} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="f-syllabus">سرفصل‌ها (هر خط: عنوان فصل: درس۱؛ درس۲)</FieldLabel>
        <Textarea
          id="f-syllabus"
          name="syllabus"
          defaultValue={c?.syllabus.map((s) => `${s.title}: ${s.lessons.join("؛ ")}`).join("\n")}
          placeholder={"شروع بافت: چله‌کشی ساده؛ پودگذاری و دفتین\nتکنیک‌های پایه: پودنمای ساده؛ راه‌راه و جناقی"}
        />
      </div>

      <TrailerFields initial={c?.trailer} videos={videos} gallery={galleryImages} />
      <ProtectionFields value={protection} spotConfigured={spotPlayerConfigured()} ffmpegAvailable={!!findFfmpeg()} />

      {c && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-teal-50 px-4 py-3 text-sm sm:col-span-2">
          <span className="text-teal-900">
            جلسات ویدیویی این دوره ({c.lessons?.length ?? 0} جلسه) را جداگانه مدیریت کنید.
          </span>
          <Link href={`/admin/courses/${c.slug}/lessons`} className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800">
            مدیریت جلسات
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 text-[15px] font-bold text-white transition-colors hover:bg-navy-700">
          {submitLabel}
        </button>
        <Link href="/admin/courses" className="inline-flex h-11 items-center rounded-xl bg-sand-200 px-6 text-sm font-bold text-ink-700 transition-colors hover:bg-sand-300">
          انصراف
        </Link>
      </div>
    </form>
  );
}
