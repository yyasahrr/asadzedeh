import type { ReactNode } from "react";

export function TableShell({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="thin-scroll overflow-x-auto rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-ink-900/10 bg-sand-50 text-right text-xs text-ink-500">
            {head.map((h) => (
              <th key={h} className="px-5 py-3.5 font-bold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-900/5">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-5 py-4 ${className}`}>{children}</td>;
}
