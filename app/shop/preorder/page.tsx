import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Hammer, Search } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatPrice, normalizeDigits, toFa } from "@/lib/format";
import { getPreorder } from "@/lib/store";

export const metadata: Metadata = { title: "پیگیری پیش‌سفارش" };
export const dynamic = "force-dynamic";

const steps = ["ثبت شده", "در انتظار بیعانه", "در حال ساخت", "آماده تحویل", "ارسال شده", "تحویل شده"] as const;

export default async function PreorderTrackPage({ searchParams }: { searchParams: Promise<{ id?: string; phone?: string }> }) {
  const { id, phone } = await searchParams;
  const po = id ? getPreorder(id.trim().toUpperCase()) : undefined;
  // Fresh submissions land here with ?id= only; lookups from the form must also match the phone.
  const justCreated = !!po && !phone;
  const verified = !!po && (justCreated || normalizeDigits(phone ?? "") === po.phone);
  const stepIndex = po ? steps.indexOf(po.status as (typeof steps)[number]) : -1;

  return (
    <>
      <PageHero title="پیگیری پیش‌سفارش" crumbs={[{ href: "/", label: "خانه" }, { href: "/shop", label: "فروشگاه" }, { label: "پیگیری پیش‌سفارش" }]} compact />
      <div className="shell py-10 lg:py-12">
        <div className="mx-auto max-w-2xl space-y-6">
          {justCreated && (
            <div className="flex items-start gap-3 rounded-2xl bg-teal-50 p-5 text-teal-900 ring-1 ring-teal-600/20">
              <CircleCheck className="mt-0.5 h-6 w-6 shrink-0 text-teal-700" />
              <div>
                <p className="font-black">درخواست شما ثبت شد 🎉</p>
                <p className="mt-1 text-sm leading-7">کد پیگیری: <b dir="ltr">{po!.id}</b> — این کد پیامک شد. کارشناس ما ظرف یک روز کاری برای تأیید مشخصات تماس می‌گیرد.</p>
              </div>
            </div>
          )}

          <form className="grid gap-3 rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-[1fr_1fr_auto]">
            <input name="id" defaultValue={id ?? ""} placeholder="کد پیگیری (PO-1201)" dir="ltr" className="h-11 rounded-xl border border-ink-900/10 bg-sand-50 px-4 text-left text-sm focus:border-teal-600 focus:outline-none" />
            <input name="phone" defaultValue={phone ?? ""} placeholder="شماره موبایل" dir="ltr" inputMode="tel" className="h-11 rounded-xl border border-ink-900/10 bg-sand-50 px-4 text-left text-sm focus:border-teal-600 focus:outline-none" />
            <button type="submit" className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white hover:bg-navy-700"><Search className="h-4 w-4" /> پیگیری</button>
          </form>

          {id && !verified && (
            <p className="rounded-2xl bg-madder-50 px-5 py-4 text-sm font-bold text-madder-700">پیش‌سفارشی با این کد و شماره پیدا نشد.</p>
          )}

          {po && verified && (
            <article className="rounded-3xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-ink-500" dir="ltr">{po.id}</p>
                  <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-navy-900"><Hammer className="h-5 w-5 text-teal-700" /> {po.productTitle}</h2>
                  <p className="mt-1 text-sm text-ink-600">ثبت: {po.createdAt}{po.eta ? ` • تحویل: ${po.eta}` : ""}</p>
                </div>
                <StatusBadge status={po.status} />
              </div>

              {stepIndex >= 0 && (
                <ol className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {steps.map((s, i) => (
                    <li key={s} className="text-center">
                      <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${i <= stepIndex ? "bg-teal-600 text-white" : "bg-sand-200 text-ink-500"}`}>{toFa(i + 1)}</div>
                      <p className={`mt-1 text-[10px] leading-4 sm:text-[11px] ${i <= stepIndex ? "font-bold text-teal-800" : "text-ink-500"}`}>{s}</p>
                    </li>
                  ))}
                </ol>
              )}

              <dl className="mt-6 grid gap-3 rounded-2xl bg-sand-50 p-4 text-sm sm:grid-cols-2">
                <div className="flex justify-between"><dt className="text-ink-500">قیمت اعلام‌شده</dt><dd className="font-bold">{formatPrice(po.quotedPrice)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-500">بیعانه</dt><dd className="font-bold">{formatPrice(po.deposit)} {po.depositPaid ? "✓ پرداخت شد" : "(پرداخت نشده)"}</dd></div>
                {Object.entries(po.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><dt className="text-ink-500">{k}</dt><dd className="font-bold">{v}</dd></div>
                ))}
                {po.note && <div className="sm:col-span-2"><dt className="text-ink-500">توضیح شما</dt><dd className="mt-1 leading-7">{po.note}</dd></div>}
              </dl>

              <h3 className="mt-6 text-sm font-black text-navy-900">تاریخچه</h3>
              <ul className="mt-2 space-y-2 border-s-2 border-teal-100 ps-4">
                {[...po.timeline].reverse().map((t, i) => (
                  <li key={i} className="relative text-sm">
                    <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-teal-600" />
                    <span className="font-bold text-ink-800">{t.status}</span>
                    <span className="text-ink-500"> • {t.date}</span>
                    {t.note && <p className="text-xs leading-6 text-ink-600">{t.note}</p>}
                  </li>
                ))}
              </ul>

              {po.status === "در انتظار بیعانه" && !po.depositPaid && (
                <div className="mt-6 rounded-2xl bg-ochre-100/60 p-4 text-sm text-ochre-900 ring-1 ring-ochre-600/20">
                  برای شروع ساخت، بیعانه <b>{formatPrice(po.deposit)}</b> را پرداخت کنید. لینک پرداخت پیامک شده است؛ در صورت نیاز با پشتیبانی تماس بگیرید.
                </div>
              )}
            </article>
          )}

          <p className="text-center text-sm text-ink-500">
            <Link href="/shop" className="font-bold text-teal-700 hover:underline">بازگشت به فروشگاه</Link>
          </p>
        </div>
      </div>
    </>
  );
}
