"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

/** Two-step delete button (click → confirm) for admin tables. Wraps a server-action form. */
export function DeleteButton({
  action,
  hidden,
  label,
}: {
  action: (fd: FormData) => void;
  hidden: { name: string; value: string };
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`حذف ${label}`}
        title={`حذف ${label}`}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-madder-700 transition-colors hover:bg-madder-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <form action={action} className="inline-flex items-center gap-1.5">
      <input type="hidden" name={hidden.name} value={hidden.value} />
      <button
        type="submit"
        className="h-8 cursor-pointer rounded-lg bg-madder-700 px-3 text-xs font-bold whitespace-nowrap text-white transition-colors hover:bg-madder-600"
      >
        حذف شود؟
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="h-8 cursor-pointer rounded-lg bg-sand-200 px-3 text-xs font-bold text-ink-700 transition-colors hover:bg-sand-300"
      >
        انصراف
      </button>
    </form>
  );
}
