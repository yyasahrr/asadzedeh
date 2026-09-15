"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "دانلود PDF / چاپ" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-navy-800 px-6 text-[15px] font-bold text-white transition-colors hover:bg-navy-700"
    >
      <Printer className="h-5 w-5" />
      {label}
    </button>
  );
}
