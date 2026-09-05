"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Clapperboard, Loader2, TriangleAlert, Upload } from "lucide-react";
import { toFa } from "@/lib/format";

interface UploadedVideo {
  id: string;
  title: string;
  durationSec?: number;
  status: string;
}

/**
 * Chunked uploader (4MB parts, 3 retries each) → /api/video/upload.
 * Works for multi‑GB files because nothing goes through a Server Action body.
 */
export function VideoUploader({
  onUploaded,
  compact = false,
  defaultTitle = "",
}: {
  onUploaded?: (video: UploadedVideo) => void;
  compact?: boolean;
  defaultTitle?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<UploadedVideo | null>(null);
  const abortRef = useRef(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    setDone(null);
    setProgress(0);
    abortRef.current = false;
    try {
      const init = await fetch("/api/video/upload?action=init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, type: file.type, title }),
      });
      const initData = (await init.json()) as { uploadId?: string; chunkSize?: number; total?: number; error?: string };
      if (!init.ok || !initData.uploadId || !initData.chunkSize || !initData.total) throw new Error(initData.error || "شروع آپلود ناموفق بود");
      const { uploadId, chunkSize, total } = initData;

      for (let i = 0; i < total; i++) {
        if (abortRef.current) throw new Error("آپلود لغو شد");
        const blob = file.slice(i * chunkSize, Math.min(file.size, (i + 1) * chunkSize));
        let ok = false;
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
          try {
            const r = await fetch(`/api/video/upload?action=chunk&uploadId=${uploadId}&index=${i}`, {
              method: "POST",
              headers: { "content-type": "application/octet-stream" },
              body: blob,
            });
            ok = r.ok;
            if (!ok && r.status === 403) throw new Error("دسترسی آپلود ندارید");
          } catch (e) {
            if (attempt === 2) throw e instanceof Error ? e : new Error("خطا در ارسال قطعه");
            await new Promise((res) => setTimeout(res, 800 * (attempt + 1)));
          }
        }
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      const fin = await fetch("/api/video/upload?action=finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uploadId, total, name: file.name, type: file.type, title }),
      });
      const finData = (await fin.json()) as { video?: UploadedVideo; error?: string };
      if (!fin.ok || !finData.video) throw new Error(finData.error || "نهایی‌سازی آپلود ناموفق بود");
      setDone(finData.video);
      onUploaded?.(finData.video);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
    } finally {
      setBusy(false);
    }
  }

  const sizeLabel = file ? `${toFa((file.size / 1024 / 1024).toFixed(1))} مگابایت` : "";

  return (
    <div className={compact ? "grid gap-3" : "grid gap-3 rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5"}>
      {!compact && (
        <div className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5 text-teal-700" />
          <h3 className="font-black text-navy-900">آپلود ویدیوی جدید</h3>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان ویدیو (مثلاً: جلسه ۳ — چله‌کشی)"
          className="h-11 rounded-xl border border-ink-900/10 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none"
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {file ? "تغییر فایل" : "انتخاب فایل ویدیو"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv,.m4v"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setDone(null);
            setError("");
            if (!title && e.target.files?.[0]) setTitle(e.target.files[0].name.replace(/\.[^.]+$/, ""));
          }}
        />
      </div>

      {file && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sand-50 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-bold text-ink-800" dir="ltr">{file.name}</p>
            <p className="text-xs text-ink-500">{sizeLabel} • آپلود قطعه‌ای ۴ مگابایتی با تلاش مجدد خودکار</p>
          </div>
          <div className="flex items-center gap-2">
            {busy ? (
              <button type="button" onClick={() => (abortRef.current = true)} className="h-9 cursor-pointer rounded-lg bg-white px-3 text-xs font-bold text-red-700 ring-1 ring-red-200">
                لغو
              </button>
            ) : (
              <button type="button" onClick={upload} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-navy-800 px-4 text-xs font-bold text-white hover:bg-navy-700">
                <Upload className="h-3.5 w-3.5" /> شروع آپلود
              </button>
            )}
          </div>
        </div>
      )}

      {busy && (
        <div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand-200">
            <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> در حال آپلود… {toFa(progress)}٪
          </p>
        </div>
      )}
      {error && (
        <p className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          <TriangleAlert className="h-3.5 w-3.5" /> {error}
        </p>
      )}
      {done && (
        <p className="flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">
          <CircleCheck className="h-3.5 w-3.5" /> «{done.title}» آپلود شد
          {done.status === "processing" ? " و در حال پردازش (HLS + واترمارک) است." : " و آماده پخش است."}
        </p>
      )}
    </div>
  );
}
