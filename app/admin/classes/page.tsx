import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getClasses } from "@/lib/store";
import { toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteClass } from "../actions";

export const metadata: Metadata = { title: "کلاس‌های حضوری" };

export default function AdminClassesPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">کلاس‌های حضوری</h1>
        <Link href="/admin/classes/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700">
          <Plus className="h-4 w-4" />
          کلاس جدید
        </Link>
      </div>
      <TableShell head={["کلاس", "شروع", "برنامه", "ثبت‌نام", "ظرفیت", "عملیات"]}>
        {getClasses().map((c) => {
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
              <Td>
                <span className="flex items-center gap-1">
                  <Link
                    href={`/admin/classes/${c.slug}/edit`}
                    aria-label={`ویرایش ${c.title}`}
                    title="ویرایش"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-800 transition-colors hover:bg-navy-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <DeleteButton action={deleteClass} hidden={{ name: "slug", value: c.slug }} label={c.title} />
                </span>
              </Td>
            </tr>
          );
        })}
      </TableShell>
    </div>
  );
}
