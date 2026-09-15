import type { Metadata } from "next";
import Link from "next/link";
import { Check, MapPin, Package, Search, Truck } from "lucide-react";
import { getOrders } from "@/lib/store";
import { formatPrice, toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { Denied } from "@/components/admin/Denied";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { can, getSessionUser } from "@/lib/auth";
import { updateOrderStatus } from "../actions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "سفارش‌ها" };
export const dynamic = "force-dynamic";

const typeFilters = [
  { key: "all", label: "همه" },
  { key: "class", label: "حضوری" },
  { key: "course", label: "آنلاین" },
  { key: "product", label: "محصول" },
];

const statusFilters = ["همه", "پرداخت شده", "در انتظار پرداخت", "ارسال شده", "تحویل شده", "لغو شده"];
const statuses = ["پرداخت شده", "در انتظار پرداخت", "ارسال شده", "تحویل شده", "لغو شده"];

function orderMatchesType(o: { lines?: { kind: string }[]; shipping?: unknown; item?: string }, type: string): boolean {
  if (type === "all") return true;
  if (type === "class") return !!o.lines?.some((l) => l.kind === "class");
  if (type === "course") return !!o.lines?.some((l) => l.kind === "course");
  if (type === "product") return !!o.lines?.some((l) => l.kind === "product" || l.kind === "preorder") || !!o.shipping;
  return true;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !can(user, "orders")) return <Denied />;
  const { status = "همه", type = "all", q = "" } = await searchParams;
  const all = getOrders();

  // Step 1: Filter by type
  const byType = all.filter((o) => orderMatchesType(o, type));

  // Step 2: Filter by status
  const byStatus = byType.filter((o) => {
    if (status === "همه") return true;
    return o.status === status;
  });

  // Step 3: Filter by search query
  const filtered = q.trim()
    ? byStatus.filter(
        (o) =>
          o.student.includes(q.trim()) ||
          o.id.toLowerCase().includes(q.trim().toLowerCase()) ||
          o.item?.includes(q.trim()) ||
          o.lines?.some((l) => l.title.includes(q.trim()))
      )
    : byStatus;

  const toShip = all.filter((o) => o.status === "پرداخت شده" && o.shipping && o.shipping.methodId !== "pickup" && !o.shipping.method.includes("حضوری")).length;

  // Type counts
  const typeCounts = {
    all: all.length,
    class: all.filter((o) => orderMatchesType(o, "class")).length,
    course: all.filter((o) => orderMatchesType(o, "course")).length,
    product: all.filter((o) => orderMatchesType(o, "product")).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">سفارش‌ها</h1>
        {toShip > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ochre-100 px-3 py-1.5 text-xs font-bold text-ochre-800">
            <Package className="h-3.5 w-3.5" /> {toFa(toShip)} سفارش کالا در انتظار ارسال
          </span>
        )}
      </div>

      {/* Search */}
      <form className="relative" role="search">
        <Search className="absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <label htmlFor="admin-order-q" className="sr-only">جست‌وجوی سفارش</label>
        <input
          id="admin-order-q"
          name="q"
          defaultValue={q}
          placeholder="جست‌وجو بر اساس نام خریدار، شماره سفارش یا عنوان اقلام…"
          className="h-11 w-full rounded-xl border border-ink-900/10 bg-card pr-11 pl-4 text-sm focus:border-teal-600 focus:outline-none"
        />
      </form>

      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        {typeFilters.map((f) => (
          <Link
            key={f.key}
            href={`/admin/orders?type=${f.key}${status !== "همه" ? `&status=${encodeURIComponent(status)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-current={type === f.key ? "true" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-bold transition-colors",
              type === f.key ? "bg-navy-800 text-white" : "bg-card text-ink-600 shadow-card ring-1 ring-ink-900/5 hover:bg-sand-100"
            )}
          >
            {f.label} ({toFa(typeCounts[f.key as keyof typeof typeCounts])})
          </Link>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <Link
            key={f}
            href={`/admin/orders?status=${encodeURIComponent(f)}${type !== "all" ? `&type=${type}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-current={status === f ? "true" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors",
              status === f ? "bg-teal-600 text-white" : "bg-sand-100 text-ink-600 hover:bg-sand-200"
            )}
          >
            {f}
          </Link>
        ))}
      </div>

      <TableShell head={["شماره", "خریدار", "اقلام", "ارسال", "مبلغ", "وضعیت", "تغییر وضعیت"]}>
        {filtered.map((o) => (
          <tr key={o.id} className="align-top transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-800 whitespace-nowrap">
              <span dir="ltr">{o.id}</span>
              {o.date && <p className="mt-0.5 text-[11px] font-normal text-ink-500">{o.date}</p>}
            </Td>
            <Td className="font-semibold">
              {o.student}
              {o.userId && <p className="text-[11px] font-normal text-teal-700">حساب کاربری متصل</p>}
            </Td>
            <Td className="text-ink-600">
              {o.lines?.length ? (
                <ul className="space-y-0.5 text-sm">
                  {o.lines.map((l, i) => (
                    <li key={i}>
                      <span className={cn("me-1 rounded px-1 text-[10px] font-bold", l.kind === "course" ? "bg-teal-100 text-teal-800" : l.kind === "class" ? "bg-navy-50 text-navy-800" : "bg-ochre-100 text-ochre-800")}>
                        {l.kind === "course" ? "دوره" : l.kind === "class" ? "کلاس" : l.kind === "preorder" ? "پیش‌سفارش" : "کالا"}
                      </span>
                      {l.title}
                      {l.qty > 1 && <span className="text-xs text-ink-500"> ×{toFa(l.qty)}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                o.item
              )}
              {o.note && <p className="mt-1 text-xs text-ink-500">یادداشت: {o.note}</p>}
            </Td>
            <Td className="text-xs text-ink-600">
              {o.shipping ? (
                <div className="min-w-[160px] space-y-0.5">
                  <p className="flex items-center gap-1 font-bold text-ink-800"><Truck className="h-3.5 w-3.5 text-teal-700" /> {o.shipping.method} {o.shipping.cost > 0 ? `(${formatPrice(o.shipping.cost)})` : "(رایگان)"}</p>
                  {o.shipping.address && (
                    <p className="flex items-start gap-1 leading-5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" /> {o.shipping.province ? `${o.shipping.province}، ` : ""}{o.shipping.city}، {o.shipping.address}{o.shipping.postalCode ? ` — کدپستی ${o.shipping.postalCode}` : ""}</p>
                  )}
                  <p>گیرنده: {o.shipping.recipient} <span dir="ltr">{o.shipping.phone}</span></p>
                  {o.shipping.trackingCode && <p className="font-bold text-teal-700">کد رهگیری: <span dir="ltr">{o.shipping.trackingCode}</span></p>}
                </div>
              ) : (
                <span className="text-ink-400">—</span>
              )}
            </Td>
            <Td className="font-bold whitespace-nowrap">
              {formatPrice(o.amount)}
              {o.discount ? <p className="text-[11px] font-normal text-teal-700">تخفیف {formatPrice(o.discount)}</p> : null}
            </Td>
            <Td><StatusBadge status={o.status} /></Td>
            <Td>
              <form action={updateOrderStatus} className="flex min-w-[200px] flex-col gap-1.5">
                <input type="hidden" name="id" value={o.id} />
                <div className="flex items-center gap-1.5">
                  <label htmlFor={`st-${o.id}`} className="sr-only">وضعیت سفارش {o.id}</label>
                  <select
                    id={`st-${o.id}`}
                    name="status"
                    defaultValue={o.status}
                    className="h-9 flex-1 cursor-pointer rounded-lg border border-ink-900/10 bg-white px-2 text-[13px] font-bold text-ink-700 focus:border-teal-600 focus:outline-none"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    aria-label="ثبت وضعیت"
                    title="ثبت وضعیت"
                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-teal-600 text-white transition-colors hover:bg-teal-700"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
                {o.shipping && (
                  <input
                    name="trackingCode"
                    defaultValue={o.shipping.trackingCode}
                    placeholder="کد رهگیری پست/تیپاکس"
                    dir="ltr"
                    className="h-8 rounded-lg border border-ink-900/10 bg-white px-2 text-left text-xs focus:border-teal-600 focus:outline-none"
                  />
                )}
              </form>
            </Td>
          </tr>
        ))}
      </TableShell>
      {filtered.length === 0 && (
        <p className="rounded-2xl bg-card p-8 text-center text-sm text-ink-500 shadow-card">سفارشی با این فیلترها پیدا نشد.</p>
      )}
    </div>
  );
}
