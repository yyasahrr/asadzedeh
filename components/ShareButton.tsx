"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function ShareButton({ title }: { title: string }) {
  const [done, setDone] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-navy-800/20 px-4 text-sm font-bold text-navy-800 transition-colors hover:border-navy-800 hover:bg-navy-50"
    >
      {done ? <Check className="h-4 w-4 text-teal-600" /> : <Share2 className="h-4 w-4" />}
      {done ? "لینک کپی شد ✓" : "اشتراک‌گذاری"}
    </button>
  );
}
