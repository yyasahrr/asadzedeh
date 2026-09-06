"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Clapperboard,
  Eye,
  FileText,
  GripVertical,
  Lock,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import type { InPersonClass, Lesson, OnlineCourse, VideoAsset } from "@/lib/types";
import { formatDuration, toFa } from "@/lib/format";
import { FieldLabel, Input, Select, Textarea } from "../ui/Input";
import { DeleteButton } from "./DeleteButton";
import { LessonAttachmentsField } from "./LessonAttachmentsField";
import { VideoUploader } from "./VideoUploader";

const statusLabel: Record<string, string> = { uploaded: "آپلودشده", processing: "در حال پردازش", ready: "آماده", failed: "خطا" };

type Action = (fd: FormData) => void;

export function LessonManager({
  course,
  videos,
  basePath,
  editing,
  actions,
  chapterActions,
  videoLibraryHref,
}: {
  course: OnlineCourse | InPersonClass;
  videos: VideoAsset[];
  basePath: string;
  editing?: Lesson;
  actions: { add: Action; update: Action; remove: Action; move: Action };
  chapterActions: { add: Action; update: Action; remove: Action; move: Action };
  videoLibraryHref?: string;
}) {
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const allLessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
  const chapters = [...(course.chapters ?? [])].sort((a, b) => a.order - b.order);
  const ownerTitle = "shortTitle" in course ? course.shortTitle : course.title;

  const searchParams = useSearchParams();
  const urlChapterId = searchParams.get("chapter") ?? undefined;

  const [openChapters, setOpenChapters] = useState<Set<string>>(() => new Set(chapters.map((ch) => ch.id)));
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>(urlChapterId ?? editing?.chapterId ?? chapters[0]?.id ?? "");
  const [userChangedChapter, setUserChangedChapter] = useState(false);

  const effectiveChapterId = userChangedChapter
    ? selectedChapterId
    : urlChapterId ?? editing?.chapterId ?? selectedChapterId;

  const newChapterRef = useRef<HTMLInputElement>(null);
  const editChapterRef = useRef<HTMLInputElement>(null);

  const toggleChapter = useCallback((id: string) => {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setOpenChapters(new Set(chapters.map((ch) => ch.id)));
  }, [chapters]);

  const collapseAll = useCallback(() => {
    setOpenChapters(new Set());
  }, []);

  const lessonsByChapter = useCallback(
    (chapterId: string) => allLessons.filter((l) => l.chapterId === chapterId),
    [allLessons]
  );

  const unassignedLessons = allLessons.filter((l) => !l.chapterId || !chapters.some((ch) => ch.id === l.chapterId));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* ── Left: Curriculum builder ── */}
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-navy-900">ساختار دوره (فصل‌ها و درس‌ها)</h2>
          <div className="flex gap-1">
            <button type="button" onClick={expandAll} className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-ink-500 hover:bg-sand-100">باز کردن همه</button>
            <button type="button" onClick={collapseAll} className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-ink-500 hover:bg-sand-100">بستن همه</button>
          </div>
        </div>

        {/* Chapter list */}
        {chapters.map((ch) => {
          const items = lessonsByChapter(ch.id);
          const isOpen = openChapters.has(ch.id);
          return (
            <div key={ch.id} className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
              {/* Chapter header */}
              <div className="flex items-center gap-2 border-b border-ink-900/5 bg-sand-50 px-4 py-3">
                <button type="button" onClick={() => toggleChapter(ch.id)} className="cursor-pointer text-ink-400 hover:text-ink-700">
                  <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                </button>
                <GripVertical className="h-4 w-4 text-ink-300" />
                {editingChapterId === ch.id ? (
                  <form action={chapterActions.update} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="slug" value={course.slug} />
                    <input type="hidden" name="id" value={ch.id} />
                    <input ref={editChapterRef} name="title" value={editingChapterTitle} onChange={(e) => setEditingChapterTitle(e.target.value)} className="flex-1 rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-sm font-bold text-navy-900 outline-none focus:ring-2 focus:ring-teal-500" autoFocus />
                    <button type="submit" className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-600">ذخیره</button>
                    <button type="button" onClick={() => setEditingChapterId(null)} className="rounded-lg bg-sand-200 px-3 py-1.5 text-xs font-bold text-ink-600 hover:bg-sand-300">لغو</button>
                  </form>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-black text-navy-900">{ch.title}</span>
                    <span className="rounded-md bg-navy-100 px-2 py-0.5 text-[11px] font-bold text-navy-700">{toFa(items.length)} درس</span>
                    <form action={chapterActions.move} className="inline">
                      <input type="hidden" name="slug" value={course.slug} />
                      <input type="hidden" name="id" value={ch.id} />
                      <input type="hidden" name="dir" value="up" />
                      <button type="submit" title="انتقال بالا" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-400 hover:bg-sand-200 hover:text-ink-700"><ArrowUp className="h-3.5 w-3.5" /></button>
                    </form>
                    <form action={chapterActions.move} className="inline">
                      <input type="hidden" name="slug" value={course.slug} />
                      <input type="hidden" name="id" value={ch.id} />
                      <input type="hidden" name="dir" value="down" />
                      <button type="submit" title="انتقال پایین" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-400 hover:bg-sand-200 hover:text-ink-700"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </form>
                    <button type="button" onClick={() => { setEditingChapterId(ch.id); setEditingChapterTitle(ch.title); }} title="ویرایش نام فصل" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-400 hover:bg-sand-200 hover:text-ink-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <DeleteButton action={chapterActions.remove} hidden={[{ name: "slug", value: course.slug }, { name: "id", value: ch.id }]} label={ch.title} />
                  </>
                )}
              </div>

              {/* Lessons inside chapter */}
              {isOpen && (
                <ul className="divide-y divide-ink-900/5">
                  {items.length === 0 && (
                    <li className="px-5 py-4 text-center text-xs text-ink-400">هنوز درسی در این فصل اضافه نشده است.</li>
                  )}
                  {items.map((l) => {
                    const v = l.videoId ? videoById.get(l.videoId) : undefined;
                    return (
                      <li key={l.id} className={`flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors ${editing?.id === l.id ? "bg-teal-50/60 ring-2 ring-inset ring-teal-400/40" : "hover:bg-sand-50/50"}`}>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[11px] font-black text-white">{toFa(l.order)}</span>
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
                            {l.attachments?.length ? (
                              <span className="ms-1 inline-flex items-center gap-1 text-teal-700">
                                • <FileText className="inline h-3 w-3" /> {toFa(l.attachments.length)} فایل
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {v && (
                            <Link href={`${basePath}?preview=${v.id}`} title="پیش‌نمایش" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-teal-700 hover:bg-teal-50">
                              <Eye className="h-4 w-4" />
                            </Link>
                          )}
                          <form action={actions.move}>
                            <input type="hidden" name="slug" value={course.slug} />
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="dir" value="up" />
                            <button type="submit" title="بالا" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-500 hover:bg-sand-100"><ArrowUp className="h-3.5 w-3.5" /></button>
                          </form>
                          <form action={actions.move}>
                            <input type="hidden" name="slug" value={course.slug} />
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="dir" value="down" />
                            <button type="submit" title="پایین" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-500 hover:bg-sand-100"><ArrowDown className="h-3.5 w-3.5" /></button>
                          </form>
                          <Link href={`${basePath}?edit=${l.id}&chapter=${l.chapterId}`} title="ویرایش" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-navy-700 hover:bg-sand-100">
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <DeleteButton action={actions.remove} hidden={[{ name: "slug", value: course.slug }, { name: "id", value: l.id }]} label={l.title} />
                        </div>
                      </li>
                    );
                  })}
                  {/* Add lesson button inside chapter */}
                  <li className="px-5 py-2.5">
                    <Link href={`${basePath}?chapter=${ch.id}`} className="flex items-center gap-2 text-xs font-bold text-teal-700 hover:text-teal-600">
                      <Plus className="h-3.5 w-3.5" /> افزودن درس به این فصل
                    </Link>
                  </li>
                </ul>
              )}
            </div>
          );
        })}

        {/* Unassigned lessons */}
        {unassignedLessons.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-card shadow-card ring-2 ring-dashed ring-ochre-400/40">
            <div className="border-b border-ink-900/5 bg-ochre-50 px-5 py-3 text-sm font-black text-ochre-800">درس‌های بدون فصل</div>
            <ul className="divide-y divide-ink-900/5">
              {unassignedLessons.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ochre-200 text-[11px] font-black text-ochre-800">{toFa(l.order)}</span>
                  <span className="flex-1 text-sm font-bold text-ink-700">{l.title}</span>
                  <Link href={`${basePath}?edit=${l.id}`} className="text-xs font-bold text-teal-700 hover:underline">ویرایش و انتخاب فصل</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* New chapter form */}
        {showNewChapter ? (
          <div className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-navy-900">فصل جدید</h3>
              <button type="button" onClick={() => { setShowNewChapter(false); setNewChapterTitle(""); }} className="text-ink-400 hover:text-ink-700"><X className="h-4 w-4" /></button>
            </div>
            <form action={chapterActions.add} className="flex gap-2">
              <input type="hidden" name="slug" value={course.slug} />
              <input ref={newChapterRef} name="title" value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} placeholder="نام فصل، مثلاً: فصل اول — معرفی ابزار" className="flex-1 rounded-xl border border-ink-900/10 bg-white px-4 py-2.5 text-sm font-bold text-navy-900 outline-none ring-2 ring-transparent transition-shadow placeholder:text-ink-400 focus:border-teal-500 focus:ring-teal-500/20" required />
              <button type="submit" disabled={!newChapterTitle.trim()} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-40">
                <Plus className="h-4 w-4" /> افزودن
              </button>
            </form>
          </div>
        ) : (
          <button type="button" onClick={() => { setShowNewChapter(true); setTimeout(() => newChapterRef.current?.focus(), 50); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-900/10 py-4 text-sm font-bold text-ink-500 transition-colors hover:border-teal-400/40 hover:bg-teal-50/30 hover:text-teal-700">
            <Plus className="h-4 w-4" /> ایجاد فصل جدید
          </button>
        )}

        {chapters.length === 0 && allLessons.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-ink-900/10 p-10 text-center text-sm text-ink-500">
            <p className="font-bold text-navy-900">هنوز فصل و درسی ثبت نشده است.</p>
            <p className="mt-1">اول یک فصل بسازید، سپس درس‌های آن را اضافه کنید.</p>
          </div>
        )}
      </div>

      {/* ── Right: Add/Edit lesson form + Video uploader ── */}
      <div className="space-y-4">
        <form action={editing ? actions.update : actions.add} className="grid gap-3 rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
          <h2 className="flex items-center gap-2 font-black text-navy-900">
            {editing ? <Pencil className="h-4 w-4 text-teal-700" /> : <Plus className="h-4 w-4 text-teal-700" />}
            {editing ? `ویرایش: ${editing.title}` : "افزودن درس / قسمت جدید"}
          </h2>
          <input type="hidden" name="slug" value={course.slug} />
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div>
            <FieldLabel htmlFor="l-title">عنوان درس / قسمت *</FieldLabel>
            <Input id="l-title" name="title" required defaultValue={editing?.title} placeholder="مثلاً: چله‌کشی روی دار" />
          </div>
          <div>
            <FieldLabel htmlFor="l-chapter">انتخاب فصل *</FieldLabel>
            <Select id="l-chapter" name="chapterId" required value={effectiveChapterId} onChange={(e) => { setSelectedChapterId(e.target.value); setUserChangedChapter(true); }}>
              <option value="">— یک فصل انتخاب کنید —</option>
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.title}
                </option>
              ))}
            </Select>
            {chapters.length === 0 && (
              <p className="mt-1 text-xs text-ochre-600">ابتدا یک فصل ایجاد کنید.</p>
            )}
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
            <FieldLabel htmlFor="l-desc">توضیحات درس</FieldLabel>
            <Textarea id="l-desc" name="description" defaultValue={editing?.description} className="min-h-28" placeholder="آنچه هنرجو در این درس یاد می‌گیرد، تمرین‌ها و نکات لازم…" />
          </div>
          <LessonAttachmentsField initial={editing?.attachments} />
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
            <input type="checkbox" name="free" value="1" defaultChecked={editing?.free} className="h-4 w-4 accent-teal-700" />
            پیش‌نمایش رایگان (بدون خرید قابل تماشاست)
          </label>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-navy-800 text-sm font-bold text-white hover:bg-navy-700">
              {editing ? "ذخیره تغییرات" : "افزودن درس"}
            </button>
            {editing && (
              <Link href={basePath} className="inline-flex h-11 items-center rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300">
                انصراف
              </Link>
            )}
          </div>
        </form>

        <VideoUploader defaultTitle={`${ownerTitle} — درس ${toFa(allLessons.length + 1)}`} />
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
