import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "navy" | "teal" | "madder" | "ochre" | "moss" | "sand";

const tones: Record<Tone, string> = {
  navy: "bg-navy-50 text-navy-800 ring-navy-800/15",
  teal: "bg-teal-50 text-teal-700 ring-teal-600/20",
  madder: "bg-madder-50 text-madder-700 ring-madder-700/20",
  ochre: "bg-ochre-100/60 text-ochre-700 ring-ochre-600/25",
  moss: "bg-moss-100/60 text-moss-800 ring-moss-700/20",
  sand: "bg-sand-200/70 text-ink-700 ring-ink-900/10",
};

export function Badge({
  tone = "sand",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
