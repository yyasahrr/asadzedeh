"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import type { LessonAttachment } from "@/lib/types";
import { toFa } from "@/lib/format";

function sizeLabel(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${toFa(Math.ceil(bytes / 1024))} کیلوبایت`;
  return `${toFa((bytes / 1024 / 1024).toFixed(1))} مگابایت`;
}

export function LessonAttachmentsField({ initial = [] }: { initial?: LessonAttachment[] }) {
  const [attachments, setAttachments] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const uploaded: LessonAttachment[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/lesson-files/upload", { method: "POST", body: formData });
        const data = (await response.json()) as { attachment?: LessonAttachment; error?: string };
        if (!response.ok || !data.attachment) throw new Error(data.error || `آپلود ${file.name} ناموفق بود`);
        uploaded.push(data.attachment);
      }
      setAttachments((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "آپلود فایل ناموفق بود");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-2.5">
      <input type="hidden" name="attachments" value={JSON.stringify(attachments)} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-700">فایل‌های این درس</p>
          <p className="mt-0.5 text-xs text-ink-500">PDF، آفیس، تصویر، فایل فشرده یا صوت؛ حداکثر ۲۵ مگابایت</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-sand-200 px-3 text-xs font-bold text-ink-700 transition-colors hover:bg-sand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          افزودن فایل
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.jpg,.jpeg,.png,.webp,.mp3,.m4a"
          onChange={(event) => void upload(event.target.files)}
        />
      </div>

      {attachments.length > 0 ? (
        <ul className="grid gap-2" aria-label="فایل‌های پیوست‌شده">
          {attachments.map((attachment, index) => (
            <li key={attachment.path} className="flex items-center gap-2 rounded-lg border border-ink-900/8 bg-sand-50 p-2">
              <FileText className="h-4 w-4 shrink-0 text-teal-700" />
              <div className="min-w-0 flex-1">
                <label htmlFor={`attachment-label-${index}`} className="sr-only">عنوان فایل</label>
                <input
                  id={`attachment-label-${index}`}
                  value={attachment.label}
                  onChange={(event) =>
                    setAttachments((current) =>
                      current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item),
                    )
                  }
                  className="h-8 w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 text-sm font-bold text-ink-800 outline-none focus:border-teal-600 focus:bg-white"
                />
                <p className="truncate px-2 text-[11px] text-ink-500" dir="ltr">
                  {attachment.fileName}{attachment.sizeBytes ? ` • ${sizeLabel(attachment.sizeBytes)}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                aria-label={`حذف فایل ${attachment.label}`}
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-madder-700 hover:bg-madder-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-madder-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-ink-900/12 px-3 py-3 text-xs text-ink-500">
          <Paperclip className="h-4 w-4" /> این درس هنوز فایل ضمیمه ندارد.
        </div>
      )}
      {error ? <p className="text-xs font-bold text-madder-700" role="alert">{error}</p> : null}
    </div>
  );
}
