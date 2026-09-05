import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  "پرداخت شده": "bg-teal-50 text-teal-700 ring-teal-600/25",
  "تأیید شده": "bg-teal-50 text-teal-700 ring-teal-600/25",
  "فعال": "bg-teal-50 text-teal-700 ring-teal-600/25",
  "در حال بررسی": "bg-ochre-100/70 text-ochre-700 ring-ochre-600/30",
  "در انتظار پرداخت": "bg-ochre-100/70 text-ochre-700 ring-ochre-600/30",
  "در انتظار ارسال": "bg-sand-200/70 text-ink-700 ring-ink-900/15",
  "لغو شده": "bg-madder-50 text-madder-700 ring-madder-700/25",
  "تکمیل شده": "bg-navy-50 text-navy-800 ring-navy-800/20",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset whitespace-nowrap",
        map[status] ?? "bg-sand-200/70 text-ink-700 ring-ink-900/15"
      )}
    >
      {status}
    </span>
  );
}
