"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CloudDownload, Link2, Loader2, TriangleAlert } from "lucide-react";

interface ImportedVideo {
  id: string;
  title: string;
  status: string;
}

export function VideoImportFromUrl({
  onImported,
  compact = false,
  defaultTitle = "",
}: {
  onImported?: (video: ImportedVideo) => void;
  compact?: boolean;
  defaultTitle?: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState(defaultTitle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<ImportedVideo | null>(null);

  async function doImport() {
    if (!url.trim()) {
      setError("لینک ویدیو را وارد کنید");
      return;
    }
    setBusy(true);
    setError("");
    setDone(null);
    try {
      const res = await fetch("/api/video/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), title: title.trim() }),
      });
      const data = (await res.json()) as { video?: ImportedVideo; error?: string };
      if (!res.ok || !data.video) throw new Error(data.error || "واردسازی ناموفق بود");
      setDone(data.video);
      onImported?.(data.video);
      setUrl("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "flex flex-col gap-4" : "flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5"}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
          <CloudDownload className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-black text-navy-900">دریافت از فضای ابری (لینک مستقیم)</h3>
          <p className="mt-1 text-xs leading-5 text-ink-500">لینک https ویدیو را بدهید تا سرور مستقیماً آن را به باکت خصوصی منتقل کند.</p>
        </div>
      </div>

      <div className="rounded-xl bg-sand-50 px-3 py-2.5 text-[11px] leading-5 text-ink-600 ring-1 ring-ink-900/5">
        مناسب برای وقتی ویدیو از قبل روی آروان، لیارا یا S3 دارید. فایل پس از انتقال فقط با پلیر امن و احراز هویت پخش می‌شود، نه با URL عمومی.
      </div>

      <div className="grid gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink-700">لینک مستقیم ویدیو</label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://.../video.mp4"
              dir="ltr"
              className="h-11 w-full rounded-xl border border-ink-900/10 bg-white py-2 pr-10 pl-3 text-left text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={busy}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink-700">عنوان ویدیو (اختیاری)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: جلسه ۳ — چله‌کشی"
            className="h-11 w-full rounded-xl border border-ink-900/10 bg-white px-3 text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            disabled={busy}
          />
        </div>

        <button
          type="button"
          onClick={doImport}
          disabled={busy || !url.trim()}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy-800 text-sm font-black text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
          {busy ? "در حال انتقال به فضای خصوصی…" : "انتقال به فضای خصوصی"}
        </button>

        {busy && <p className="text-center text-[11px] text-ink-500">این مرحله ممکن است چند دقیقه طول بکشد؛ لطفاً صفحه را نبندید.</p>}

        {error && (
          <div className="flex gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {done && (
          <div className="flex gap-2 rounded-xl bg-teal-50 px-3 py-2.5 text-xs font-bold text-teal-800 ring-1 ring-teal-200">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>«{done.title}» با موفقیت اضافه شد و آماده اتصال به جلسات است.</span>
          </div>
        )}
      </div>
    </div>
  );
}
