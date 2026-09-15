"use client";

import { useState } from "react";
import { Clapperboard, Link2, Upload } from "lucide-react";
import type { Trailer } from "@/lib/types";
import { toFa } from "@/lib/format";
import { FieldLabel, Input, Select } from "../ui/Input";
import { VideoUploader } from "./VideoUploader";

interface VideoOption {
  id: string;
  title: string;
  durationSec?: number;
  status: string;
}

/**
 * Trailer / teaser picker shared by CourseForm and ClassForm.
 * Emits hidden inputs: trailerKind, trailerSrc, trailerPoster.
 */
export function TrailerFields({ initial, videos, gallery }: { initial?: Trailer; videos: VideoOption[]; gallery: { value: string; label: string }[] }) {
  const [kind, setKind] = useState<Trailer["kind"]>(initial?.kind ?? "none");
  const [src, setSrc] = useState(initial?.src ?? "");
  const [list, setList] = useState<VideoOption[]>(videos);
  const [poster, setPoster] = useState(initial?.poster ?? "");

  const kinds: { value: Trailer["kind"]; label: string; icon: typeof Upload }[] = [
    { value: "none", label: "بدون تیزر", icon: Clapperboard },
    { value: "upload", label: "ویدیوی آپلودشده", icon: Upload },
    { value: "embed", label: "لینک اپارات / یوتیوب", icon: Link2 },
  ];

  return (
    <fieldset className="rounded-2xl border border-dashed border-ink-900/15 p-4 sm:col-span-2">
      <legend className="px-2 text-sm font-black text-navy-900">تیزر / پیش‌نمایش دوره</legend>
      <input type="hidden" name="trailerKind" value={kind} />
      <input type="hidden" name="trailerSrc" value={kind === "none" ? "" : src} />
      <input type="hidden" name="trailerPoster" value={poster} />

      <div className="mb-4 flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => {
              setKind(k.value);
              if (k.value !== kind) setSrc("");
            }}
            className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${kind === k.value ? "bg-navy-800 text-white" : "bg-sand-100 text-ink-700 hover:bg-sand-200"}`}
          >
            <k.icon className="h-4 w-4" />
            {k.label}
          </button>
        ))}
      </div>

      {kind === "embed" && (
        <div className="grid gap-3">
          <div>
            <FieldLabel htmlFor="tr-embed">آدرس Embed</FieldLabel>
            <Input id="tr-embed" value={src} onChange={(e) => setSrc(e.target.value)} placeholder="https://www.aparat.com/video/video/embed/videohash/XXXX/vt/frame" dir="ltr" className="text-left" />
            <p className="mt-1 text-xs text-ink-500">در آپارات: اشتراک‌گذاری → کد Embed → مقدار src. در یوتیوب: https://www.youtube.com/embed/ID</p>
          </div>
          {src && /^https?:\/\//.test(src) && (
            <div className="aspect-video overflow-hidden rounded-xl bg-black">
              <iframe src={src} title="پیش‌نمایش تیزر" className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen />
            </div>
          )}
        </div>
      )}

      {kind === "upload" && (
        <div className="grid gap-3">
          <div>
            <FieldLabel htmlFor="tr-video">انتخاب از کتابخانه ویدیو</FieldLabel>
            <Select id="tr-video" value={src} onChange={(e) => setSrc(e.target.value)}>
              <option value="">— انتخاب کنید —</option>
              {list.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                  {v.durationSec ? ` (${toFa(Math.round(v.durationSec / 60))} دقیقه)` : ""}
                  {v.status !== "ready" ? ` — ${v.status === "processing" ? "در حال پردازش" : v.status === "failed" ? "خطا" : "آپلودشده"}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <details className="rounded-xl bg-sand-50 p-3">
            <summary className="cursor-pointer text-sm font-bold text-teal-800">یا همین‌جا یک تیزر جدید آپلود کنید</summary>
            <div className="mt-3">
              <VideoUploader
                compact
                defaultTitle="تیزر دوره"
                onUploaded={(v) => {
                  setList((l) => [v, ...l]);
                  setSrc(v.id);
                }}
              />
            </div>
          </details>
          <div>
            <FieldLabel htmlFor="tr-poster">تصویر کاور تیزر (اختیاری)</FieldLabel>
            <Select id="tr-poster" value={poster} onChange={(e) => setPoster(e.target.value)}>
              <option value="">— همان تصویر دوره —</option>
              {gallery.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </Select>
          </div>
        </div>
      )}
    </fieldset>
  );
}
