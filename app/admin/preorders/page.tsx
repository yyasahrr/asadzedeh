import type { Metadata } from "next";
import Link from "next/link";
import { Hammer, Phone } from "lucide-react";
import { updatePreorder } from "../actions";
import { Denied } from "@/components/admin/Denied";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { can, getSessionUser } from "@/lib/auth";
import { formatPrice, toFa } from "@/lib/format";
import { getPreorders } from "@/lib/store";
import type { PreorderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "پیش‌سفارش‌ها" };
export const dynamic = "force-dynamic";

const statuses: PreorderStatus[] = ["ثبت شده", "در انتظار بیعانه", "در حال ساخت", "آماده تحویل", "ارسال شده", "تحویل شده", "لغو شده"];

export default async function PreordersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getSessionUser();
  if (!user || !can(user, "preorders")) return <Denied />;
  const { status } = await searchParams;
  const all = getPreorders();
  const list = status ? all.filter((p) => p.status === status) : all;
  const counts = Object.fromEntries(statuses.map((s) => [s, all.filter((p) => p.status === s).length]));
  const depositsPending = all.filter((p) => p.status === "در انتظار بیعانه" && !p.depositPaid).reduce((s, p) => s + p.deposit, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-900">پیش‌سفارش‌های ساخت</h1>
        <p className="mt-1 text-sm text-ink-600">{toFa(all.length)} درخواست • بیعانه در انتظار: {formatPrice(depositsPending)} • تغییر وضعیت به مشتری پیامک می‌شود.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/preorders" className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${!status ? "bg-navy-800 text-white" : "bg-sand-100 text-ink-700 hover:bg-sand-200"}`}>همه ({toFa(all.length)})</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/preorders?status=${encodeURIComponent(s)}`} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${status === s ? "bg-navy-800 text-white" : "bg-sand-100 text-ink-700 hover:bg-sand-200"}`}>
            {s} ({toFa(counts[s] ?? 0)})
          </Link>
        ))}
      </div>

      {list.length === 0 && <div className="rounded-2xl bg-card p-10 text-center text-sm text-ink-500 shadow-card">پیش‌سفارشی در این وضعیت نیست.</div>}

      <div className="grid gap-4 xl:grid-cols-2">
        {list.map((p) => (
          <article key={p.id} className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-ink-500" dir="ltr">{p.id} • {p.createdAt}</p>
                <h2 className="mt-1 flex items-center gap-2 font-black text-navy-900"><Hammer className="h-4 w-4 text-ochre-600" /> {p.productTitle}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-700">
                  {p.customer} <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-xs font-bold text-teal-700" dir="ltr"><Phone className="h-3 w-3" /> {p.phone}</a>
                </p>
              </div>
              <StatusBadge status={p.status} />
            </div>

            {(Object.keys(p.specs).length > 0 || p.note) && (
              <dl className="mt-3 grid gap-1.5 rounded-xl bg-sand-50 p-3 text-xs sm:grid-cols-2">
                {Object.entries(p.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2"><dt className="text-ink-500">{k}</dt><dd className="font-bold text-ink-800">{v}</dd></div>
                ))}
                {p.note && <div className="sm:col-span-2"><dt className="text-ink-500">توضیح مشتری</dt><dd className="mt-0.5 leading-6 text-ink-700">{p.note}</dd></div>}
              </dl>
            )}

            <form action={updatePreorder} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={p.id} />
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor={`st-${p.id}`}>وضعیت</label>
                <select id={`st-${p.id}`} name="status" defaultValue={p.status} className="h-10 w-full cursor-pointer rounded-xl border border-ink-900/10 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none">
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor={`qp-${p.id}`}>قیمت قطعی (تومان)</label>
                <input id={`qp-${p.id}`} name="quotedPrice" defaultValue={p.quotedPrice} inputMode="numeric" dir="ltr" className="h-10 w-full rounded-xl border border-ink-900/10 bg-white px-3 text-left text-sm focus:border-teal-600 focus:outline-none" />
                <p className="mt-1 text-[11px] text-ink-500">بیعانه فعلی: {formatPrice(p.deposit)}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor={`eta-${p.id}`}>زمان تحویل</label>
                <input id={`eta-${p.id}`} name="eta" defaultValue={p.eta} placeholder="مثلاً: ۲۵ مهر" className="h-10 w-full rounded-xl border border-ink-900/10 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor={`note-${p.id}`}>یادداشت برای تاریخچه</label>
                <input id={`note-${p.id}`} name="note" placeholder="مثلاً: تماس گرفته شد، ابعاد تأیید شد" className="h-10 w-full rounded-xl border border-ink-900/10 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none" />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-ink-700">
                <input type="checkbox" name="depositPaid" value="1" defaultChecked={p.depositPaid} className="h-4 w-4 accent-teal-700" /> بیعانه دریافت شد
              </label>
              <div className="flex justify-end">
                <button type="submit" className="h-10 cursor-pointer rounded-xl bg-navy-800 px-5 text-sm font-bold text-white hover:bg-navy-700">ذخیره و اطلاع‌رسانی</button>
              </div>
            </form>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-bold text-ink-500">تاریخچه ({toFa(p.timeline.length)})</summary>
              <ul className="mt-2 space-y-1 text-xs text-ink-600">
                {[...p.timeline].reverse().map((t, i) => (
                  <li key={i}><b>{t.status}</b> • {t.date}{t.note ? ` — ${t.note}` : ""}</li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
