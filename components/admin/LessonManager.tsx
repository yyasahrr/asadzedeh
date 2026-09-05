import Link from "next/link";
import { ArrowDown, ArrowUp, Clapperboard, Eye, Lock, Pencil, Plus } from "lucide-react";
import type { Lesson, OnlineCourse, VideoAsset } from "@/lib/types";
import { toFa } from "@/lib/format";
import { formatDuration } from "@/lib/video";
import { FieldLabel, Input, Select, Textarea } from "../ui/Input";
import { DeleteButton } from "./DeleteButton";
import { VideoUploader } from "./VideoUploader";

const statusLabel: Record<string, string> = { uploaded: "آپلودشده", processing: "در حال پردازش", ready: "آماده", failed: "خطا" };

type Action = (fd: FormData) => void;

/**
 * Lesson list + add/edit form. Used by the admin (/admin/courses/[slug]/lessons)
 * and the instructor panel (/instructor/courses/[slug]) with different bound actions.
 */
export function LessonManager({
  course,
  videos,
  basePath,
  editing,
  actions,
  videoLibraryHref,
}: {
  course: OnlineCourse;
  videos: VideoAsset[];
  basePath: string;
  editing?: Lesson;
  actions: { add: Action; update: Action; remove: Action; move: Action };
  videoLibraryHref?: string;
}) {
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
  const chapters = Array.from(new Set([...course.syllabus.map((s) => s.title), ...lessons.map((l) => l.chapter)]));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {lessons.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-ink-900/10 p-10 text-center text-sm text-ink-500">
            هنوز جلسه‌ای ثبت نشده. از فرم کنار، اولین جلسه را اضافه کنید.
          </div>
        )}
        {chapters.map((ch) => {
          const items = lessons.filter((l) => l.chapter === ch);
          if (items.length === 0) return null;
          return (
            <div key={ch} className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
              <div className="border-b border-ink-900/5 bg-sand-50 px-5 py-3 text-sm font-black text-navy-900">{ch}</div>
              <ul className="divide-y divide-ink-900/5">
                {items.map((l) => {
                  const v = l.videoId ? videoById.get(l.videoId) : undefined;
                  return (
                    <li key={l.id} className={`flex flex-wrap items-center gap-3 px-5 py-3.5 ${editing?.id === l.id ? "bg-teal-50/60" : ""}`}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-black text-white">{toFa(l.order)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                          {l.title}
                          {l.free ? <span className="rounded-md bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">رایگان</span> : <Lock className="h-3.5 w-3.5 text-ink-400" />}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {toFa(l.durationMin)} دقیقه
                          {v ? (
                            <>
                              {" • "}
                              <Clapperboard className="inline h-3 w-3" /> {v.title}
                              {v.status !== "ready" && <span className={`ms-1 font-bold ${v.status === "failed" ? "text-red-600" : "text-ochre-600"}`}>({statusLabel[v.status]})</span>}
                            </>
                          ) : (
                            <span className="ms-1 text-ochre-600">• بدون ویدیو</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {v && (
                          <Link href={`${basePath}?preview=${v.id}`} title="پیش‌نمایش" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-teal-700 hover:bg-teal-50">
                            <Eye className="h-4 w-4" />
                          </Link>
                        )}
                        <form action={actions.move}>
                          <input type="hidden" name="slug" value={course.slug} />
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="dir" value="up" />
                          <button type="submit" title="بالا" className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-500 hover:bg-sand-100"><ArrowUp className="h-4 w-4" /></button>
                        </form>
                        <form action={actions.move}>
                          <input type="hidden" name="slug" value={course.slug} />
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="dir" value="down" />
                          <button type="submit" title="پایین" className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-500 hover:bg-sand-100"><ArrowDown className="h-4 w-4" /></button>
                        </form>
                        <Link href={`${basePath}?edit=${l.id}`} title="ویرایش" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-700 hover:bg-sand-100">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <DeleteButton action={actions.remove} hidden={[{ name: "slug", value: course.slug }, { name: "id", value: l.id }]} label={l.title} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <form action={editing ? actions.update : actions.add} className="grid gap-3 rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
          <h2 className="flex items-center gap-2 font-black text-navy-900">
            {editing ? <Pencil className="h-4 w-4 text-teal-700" /> : <Plus className="h-4 w-4 text-teal-700" />}
            {editing ? `ویرایش: ${editing.title}` : "افزودن جلسه جدید"}
          </h2>
          <input type="hidden" name="slug" value={course.slug} />
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div>
            <FieldLabel htmlFor="l-title">عنوان جلسه *</FieldLabel>
            <Input id="l-title" name="title" required defaultValue={editing?.title} placeholder="مثلاً: چله‌کشی روی دار" />
          </div>
          <div>
            <FieldLabel htmlFor="l-chapter">فصل</FieldLabel>
            <Input id="l-chapter" name="chapter" list="chapters" defaultValue={editing?.chapter ?? chapters[0] ?? ""} placeholder="نام فصل" />
            <datalist id="chapters">
              {chapters.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <FieldLabel htmlFor="l-video">ویدیو (از کتابخانه)</FieldLabel>
            <Select id="l-video" name="videoId" defaultValue={editing?.videoId ?? ""}>
              <option value="">— بدون ویدیو / بعداً —</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} ({formatDuration(v.durationSec)}) {v.status !== "ready" ? `— ${statusLabel[v.status]}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="l-dur">مدت (دقیقه)</FieldLabel>
              <Input id="l-dur" name="durationMin" inputMode="numeric" defaultValue={editing?.durationMin ?? 15} dir="ltr" className="text-left" />
            </div>
            {editing && (
              <div>
                <FieldLabel htmlFor="l-order">ترتیب</FieldLabel>
                <Input id="l-order" name="order" inputMode="numeric" defaultValue={editing.order} dir="ltr" className="text-left" />
              </div>
            )}
          </div>
          <div>
            <FieldLabel htmlFor="l-desc">توضیح کوتاه (اختیاری)</FieldLabel>
            <Textarea id="l-desc" name="description" defaultValue={editing?.description} className="min-h-20" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
            <input type="checkbox" name="free" value="1" defaultChecked={editing?.free} className="h-4 w-4 accent-teal-700" />
            پیش‌نمایش رایگان (بدون خرید قابل تماشاست)
          </label>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-navy-800 text-sm font-bold text-white hover:bg-navy-700">
              {editing ? "ذخیره تغییرات" : "افزودن جلسه"}
            </button>
            {editing && (
              <Link href={basePath} className="inline-flex h-11 items-center rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300">
                انصراف
              </Link>
            )}
          </div>
        </form>

        <VideoUploader defaultTitle={`${course.shortTitle} — جلسه ${toFa(lessons.length + 1)}`} />
        <p className="text-xs leading-6 text-ink-500">
          پس از آپلود، ویدیو در فهرست بالا ظاهر می‌شود و می‌توانید آن را به جلسه متصل کنید.
          {videoLibraryHref && (
            <>
              {" "}مدیریت کل ویدیوها در <Link href={videoLibraryHref} className="font-bold text-teal-700">کتابخانه ویدیو</Link>.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
