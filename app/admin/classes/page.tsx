import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { inPersonClasses } from "@/lib/data";
import { toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";

export const metadata: Metadata = { title: "کلاس‌های حضوری" };

export default function AdminClassesPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">کلاس‌های حضوری</h1>
        <button type="button" className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700">
          <Plus className="h-4 w-4" />
          کلاس جدید
        </button>
      </div>
      <TableShell head={["کلاس", "شروع", "برنامه", "ثبت‌نام", "ظرفیت"]}>
        {inPersonClasses.map((c) => {
          const taken = c.capacity - c.remaining;
          return (
            <tr key={c.slug} className="transition-colors hover:bg-sand-50">
              <Td className="font-bold text-navy-900">{c.title}</Td>
              <Td className="whitespace-nowrap text-ink-600">{c.startDate}</Td>
              <Td className="whitespace-nowrap text-ink-600">{c.days} • {c.time}</Td>
              <Td>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-24 overflow-hidden rounded-full bg-ink-900/10">
                    <span
                      className={`block h-full rounded-full ${c.remaining <= 3 ? "bg-madder-700" : "bg-teal-600"}`}
                      style={{ width: `${Math.round((taken / c.capacity) * 100)}%` }}
                    />
                  </span>
                  <span className="text-xs font-bold">{toFa(taken)}/{toFa(c.capacity)}</span>
                </span>
              </Td>
              <Td className={`font-bold whitespace-nowrap ${c.remaining <= 3 ? "text-madder-700" : "text-ink-700"}`}>
                {toFa(c.remaining)} خالی
              </Td>
            </tr>
          );
        })}
      </TableShell>
    </div>
  );
}
