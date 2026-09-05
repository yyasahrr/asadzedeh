import { Star } from "lucide-react";
import { formatRating } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`امتیاز ${value} از ۵`}>
      <span className="flex" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={
              i < Math.round(value)
                ? "h-3.5 w-3.5 fill-ochre-500 text-ochre-500"
                : "h-3.5 w-3.5 text-ink-300"
            }
          />
        ))}
      </span>
      <span className="text-xs font-bold text-ink-700">{formatRating(value)}</span>
    </span>
  );
}
