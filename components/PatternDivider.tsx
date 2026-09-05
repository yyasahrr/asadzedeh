import { cn } from "@/lib/utils";

/** Decorative kilim divider: thin strip with an optional centered diamond. */
export function PatternDivider({
  ornament = false,
  className,
}: {
  ornament?: boolean;
  className?: string;
}) {
  if (!ornament) {
    return <div className={cn("pattern-strip", className)} aria-hidden />;
  }
  return (
    <div className={cn("flex items-center gap-3", className)} aria-hidden>
      <div className="pattern-strip-thin flex-1 rounded-full" />
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
        <rect x="6" y="6" width="12" height="12" fill="#9D382C" transform="rotate(45 12 12)" />
        <rect x="9.5" y="9.5" width="5" height="5" fill="#F3E9D6" transform="rotate(45 12 12)" />
      </svg>
      <div className="pattern-strip-thin flex-1 rounded-full" />
    </div>
  );
}
