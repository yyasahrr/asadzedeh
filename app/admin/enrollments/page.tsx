import type { Metadata } from "next";
import Link from "next/link";
import { Search, UsersRound } from "lucide-react";
import { getClasses, getOrders } from "@/lib/store";
import { formatPrice, toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { Denied } from "@/components/admin/Denied";
import { can, getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "اعضای دوره‌ها" };
export const dynamic = "force-dynamic";

interface EnrollmentRow {
  orderId: string;
  orderDate: string;
  student: string;
  phone: string;
  kind: "class" | "course";
  slug: string;
  title: string;
  price: number;
  status: string;
}

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !can(user, "orders")) return <Denied />;

  const { type = "all", q = "" } = await searchParams;
  const orders = getOrders();
  const classes = getClasses();

  const rows: EnrollmentRow[] = [];

  for (const order of orders) {
    if (order.status !== "پرداخت شده") continue;
    for (const line of order.lines ?? []) {
      if (line.kind !== "class" && line.kind !== "course") continue;
      rows.push({
        orderId: order.id,
        orderDate: order.date ?? "",
        student: order.student,
        phone: order.phone ?? "",
        kind: line.kind,
        slug: line.slug,
        title: line.title,
        price: line.price,
        status: order.status,
      });
    }
  }

  // Filter by type
  const filtered = rows.filter((r) => {
    if (type === "class") return r.kind === "class";
    if (type === "course") return r.kind === "course";
    return true;
  });

  // Filter by search query
  const searched = q.trim()
    ? filtered.filter(
        (r) =>
          r.student.includes(q.trim()) ||
          r.title.includes(q.trim()) ||
          r.phone.includes(q.trim()) ||
          r.orderId.toLowerCase().includes(q.trim().toLowerCase())
      )
    : filtered;

  // Stats
  const classCount = rows.filter((r) => r.kind === "class").length;
  const courseCount = rows.filter((r) => r.kind === "course").length;

  // Per-class enrollment counts
  const classEnrollments = new Map<string, number>();
  for (const r of rows.filter((r) => r.kind === "class")) {
    classEnrollments.set(r.slug, (classEnrollments.get(r.slug) ?? 0) + 1);
  }

  const filters = [
    { key: "all", label: "همه", count: rows.length },
    { key: "class", label: "حضوری", count: classCount },
    { key: "course", label: "آنلاین", count: courseCount },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">اعضای دوره‌ها</h1>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1.5 text-xs font-bold text-teal-800">
            <UsersRound className="h-3.5 w-3.5" /> {toFa(rows.length)} ثبت‌نام
          </span>
        </div>
      </div>

      {/* Class capacity overview */}
      {classEnrollments.size > 0 && (
        <div className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
          <h2 className="mb-3 text-sm font-black text-navy-900">وضعیت ظرفیت کلاس‌ها</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
             {classes.map((c) => {
              const taken = c.capacity - c.remaining;
              return (
                <div key={c.slug} className="rounded-xl bg-sand-50 p-3">
                  <p className="text-xs font-bold text-navy-900 line-clamp-1">{c.title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-900/10">
                      <span
                        className={`block h-full rounded-full ${c.remaining <= 3 ? "bg-madder-700" : "bg-teal-600"}`}
                        style={{ width: `${Math.round((taken / c.capacity) * 100)}%` }}
                      />
                    </span>
                    <span className="text-[11px] font-bold text-ink-600">{toFa(taken)}/{toFa(c.capacity)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/enrollments" : `/admin/enrollments?type=${f.key}`}
            aria-current={type === f.key ? "true" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-bold transition-colors",
              type === f.key ? "bg-navy-800 text-white" : "bg-card text-ink-600 shadow-card ring-1 ring-ink-900/5 hover:bg-sand-100"
            )}
          >
            {f.label} ({toFa(f.count)})
          </Link>
        ))}
      </div>

      {/* Search */}
      <form className="relative" role="search">
        <Search className="absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <label htmlFor="admin-enrollment-q" className="sr-only">جست‌وجوی عضو</label>
        <input
          id="admin-enrollment-q"
          name="q"
          defaultValue={q}
          placeholder="جست‌وجو بر اساس نام، عنوان دوره، شماره موبایل یا شماره سفارش…"
          className="h-11 w-full rounded-xl border border-ink-900/10 bg-card pr-11 pl-4 text-sm focus:border-teal-600 focus:outline-none"
        />
      </form>

      {/* Table */}
      <TableShell head={["نام هنرجو", "موبایل", "نوع", "عنوان دوره", "مبلغ", "شماره سفارش", "تاریخ"]}>
        {searched.map((r, i) => (
          <tr key={`${r.orderId}-${r.slug}-${i}`} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-900">{r.student}</Td>
            <Td>
              <span dir="ltr" className="text-ink-600">{r.phone || "—"}</span>
            </Td>
            <Td>
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-bold",
                  r.kind === "class" ? "bg-navy-50 text-navy-800" : "bg-teal-100 text-teal-800"
                )}
              >
                {r.kind === "class" ? "حضوری" : "آنلاین"}
              </span>
            </Td>
            <Td className="text-sm font-semibold text-ink-700">{r.title}</Td>
            <Td className="whitespace-nowrap font-bold text-ink-800">{formatPrice(r.price)}</Td>
            <Td>
              <Link href={`/admin/orders?status=${encodeURIComponent("پرداخت شده")}`} className="font-bold text-teal-700 hover:underline" dir="ltr">
                {r.orderId}
              </Link>
            </Td>
            <Td className="whitespace-nowrap text-ink-600">{r.orderDate}</Td>
          </tr>
        ))}
      </TableShell>

      {searched.length === 0 && (
        <p className="rounded-2xl bg-card p-8 text-center text-sm text-ink-500 shadow-card">
          {q.trim() ? "نتیجه‌ای با این جست‌وجو پیدا نشد." : "هنوز ثبت‌نامی ثبت نشده است."}
        </p>
      )}
    </div>
  );
}
