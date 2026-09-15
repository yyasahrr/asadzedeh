"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2 } from "lucide-react";
import { uploadMedia } from "@/app/admin/actions";

export function MediaUploader() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadMedia(fd);
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error ?? "خطا در آپلود");
    }
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-navy-800/25 bg-card p-6 text-center">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="انتخاب تصویر"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl bg-navy-800 px-7 font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CloudUpload className="h-5 w-5" />}
        {busy ? "در حال آپلود…" : "آپلود تصویر جدید"}
      </button>
      <p className="mt-2 text-xs text-ink-500">PNG، JPG یا WebP تا ۵ مگابایت</p>
      {error && <p className="mt-2 text-sm font-bold text-madder-700">{error}</p>}
    </div>
  );
}
