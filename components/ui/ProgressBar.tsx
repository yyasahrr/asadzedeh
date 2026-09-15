import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  tone = "teal",
  showLabel = false,
  className,
}: {
  value: number;
  tone?: "teal" | "madder" | "navy" | "ochre";
  showLabel?: boolean;
  className?: string;
}) {
  const tones = {
    teal: "bg-teal-600",
    madder: "bg-madder-700",
    navy: "bg-navy-800",
    ochre: "bg-ochre-600",
  } as const;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-ink-900/10"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn("h-full rounded-full transition-all", tones[tone])} style={{ width: `${value}%` }} />
      </div>
      {showLabel && <span className="text-xs font-bold text-ink-600">٪{toFa(value)}</span>}
    </div>
  );
}
