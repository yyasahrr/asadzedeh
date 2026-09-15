"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Link2, Loader2, TriangleAlert } from "lucide-react";
import { toFa } from "@/lib/format";

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
    <div className={compact ? "grid gap-3" : "grid gap-3 rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5"}>
      {!compact && (
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-teal-700" />
          <h3 className="font-black text-navy-900">دریافت ویدیو از فضای ابری (لینک مستقیم)</h3>
        </div>
      )}
      <p className="text-xs leading-6 text-ink-500">
        اگر ویدیو از قبل روی یک فضای ابری (مثلاً لیارا، آروان، S3) دارید، لینک مستقیم آن را وارد کنید تا مستقیماً به مخزن خصوصی سایت منتقل شود.
        لینک باید <span dir="ltr" className="font-mono text-[11px]">https://</span> و قابل دانلود باشد و به شبکه خصوصی اشاره نکند.
        پس از انتقال، فایل فقط از طریق پلیر امن و با احراز هویت پخش می‌شود.
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://.../video.mp4"
          dir="ltr"
          className="h-11 rounded-xl border border-ink-900/10 bg-white px-3 text-left text-sm focus:border-teal-600 focus:outline-none"
          disabled={busy}
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان ویدیو (اختیاری)"
          className="h-11 rounded-xl border border-ink-900/10 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none"
          disabled={busy}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={doImport}
          disabled={busy || !url.trim()}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          {busy ? "در حال انتقال…" : "انتقال به فضای خصوصی"}
        </button>
        {busy && <span className="text-xs text-ink-500">این مرحله ممکن است چند دقیقه طول بکشد؛ صفحه را نبندید.</span>}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          <TriangleAlert className="h-3.5 w-3.5" /> {error}
        </p>
      )}
      {done && (
        <p className="flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">
          <CircleCheck className="h-3.5 w-3.5" /> «{done.title}» با موفقیت به کتابخانه اضافه شد و آماده اتصال به جلسات است.
        </p>
      )}
    </div>
  );
}
