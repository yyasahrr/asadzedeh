"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { uploadMedia } from "@/app/admin/actions";

/** Image picker: choose from gallery OR upload a new file. Stores path in hidden input. */
export function UploadField({
  name,
  initial,
  gallery,
  label,
}: {
  name: string;
  initial?: string;
  gallery: { value: string; label: string }[];
  label: string;
}) {
  const [value, setValue] = useState(initial ?? gallery[0]?.value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadMedia(fd);
    setBusy(false);
    if (res.ok && res.path) {
      setValue(res.path);
    } else {
      setError(res.error ?? "خطا در آپلود");
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-bold text-ink-700">{label}</span>
      <input type="hidden" name={name} value={value} />
      <div className="flex gap-2">
        <select
          value={gallery.some((g) => g.value === value) ? value : "__upload"}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 min-w-0 flex-1 cursor-pointer rounded-xl border border-ink-900/10 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none"
          aria-label={label}
        >
          {gallery.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
          {!gallery.some((g) => g.value === value) && (
            <option value="__upload">تصویر آپلودشده ✓</option>
          )}
        </select>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-teal-600 px-4 text-sm font-bold whitespace-nowrap text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          آپلود
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
          aria-label="آپلود تصویر جدید"
        />
      </div>
      {value && (
        <img src={value} alt="پیش‌نمایش" className="mt-2 h-20 w-32 rounded-lg object-cover ring-1 ring-ink-900/10" />
      )}
      {error && <p className="mt-1.5 text-xs font-bold text-madder-700">{error}</p>}
    </div>
  );
}
