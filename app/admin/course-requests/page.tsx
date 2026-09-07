import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getCourseRequests } from "@/lib/store";
import { toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { Denied } from "@/components/admin/Denied";
import { can, getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "درخواست‌های دوره جدید" };
export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  "پیش‌نویس": "bg-sand-100 text-ink-600",
  "در انتظار بررسی": "bg-ochre-100 text-ochre-800",
  "تأیید شده": "bg-teal-100 text-teal-800",
  "رد شده": "bg-madder-50 text-madder-700",
};

export default async function AdminCourseRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !can(user, "courses")) return <Denied />;

  const { status = "all" } = await searchParams;
  const allRequests = getCourseRequests();

  const filtered = status === "all" ? allRequests : allRequests.filter((r) => r.status === status);

  const pendingCount = allRequests.filter((r) => r.status === "در انتظار بررسی").length;

  const statusFilters = [
    { key: "all", label: "همه", count: allRequests.length },
    { key: "در انتظار بررسی", label: "در انتظار بررسی", count: allRequests.filter((r) => r.status === "در انتظار بررسی").length },
    { key: "پیش‌نویس", label: "پیش‌نویس", count: allRequests.filter((r) => r.status === "پیش‌نویس").length },
    { key: "تأیید شده", label: "تأیید شده", count: allRequests.filter((r) => r.status === "تأیید شده").length },
    { key: "رد شده", label: "رد شده", count: allRequests.filter((r) => r.status === "رد شده").length },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">درخواست‌های دوره جدید</h1>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ochre-50 px-3 py-1.5 text-xs font-bold text-ochre-800">
            <BookOpen className="h-3.5 w-3.5" /> {toFa(pendingCount)} درخواست منتظر بررسی
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/course-requests" : `/admin/course-requests?status=${encodeURIComponent(f.key)}`}
            aria-current={status === f.key ? "true" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-bold transition-colors",
              status === f.key ? "bg-navy-800 text-white" : "bg-card text-ink-600 shadow-card ring-1 ring-ink-900/5 hover:bg-sand-100"
            )}
          >
            {f.label} ({toFa(f.count)})
          </Link>
        ))}
      </div>

      <TableShell head={["عنوان", "مدرس", "دسته", "سطح", "قیمت", "وضعیت", "تاریخ", "عملیات"]}>
        {filtered.map((r) => (
          <tr key={r.id} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-900">{r.shortTitle}</Td>
            <Td className="text-ink-600">{r.instructorName}</Td>
            <Td className="text-ink-600">{r.category}</Td>
            <Td className="text-ink-600">{r.level}</Td>
            <Td className="font-bold whitespace-nowrap">
              {r.price > 0 ? `${toFa(r.price)} تومان` : "رایگان"}
            </Td>
            <Td>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", statusColors[r.status] ?? "")}>
                {r.status}
              </span>
            </Td>
            <Td className="whitespace-nowrap text-xs text-ink-600">
              {new Date(r.createdAt).toLocaleDateString("fa-IR")}
            </Td>
            <Td>
              <Link
                href={`/admin/course-requests/${r.id}`}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-navy-800 px-3 text-xs font-bold text-white transition-colors hover:bg-navy-700"
              >
                بررسی
              </Link>
            </Td>
          </tr>
        ))}
      </TableShell>

      {filtered.length === 0 && (
        <p className="rounded-2xl bg-card p-8 text-center text-sm text-ink-500 shadow-card">
          درخواستی با این فیلتر نیست.
        </p>
      )}
    </div>
  );
}
