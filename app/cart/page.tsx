import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, ShieldCheck, Trash2 } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/Button";
import { getCourses } from "@/lib/store";
import { formatPrice, toFa } from "@/lib/format";

export const metadata: Metadata = { title: "سبد خرید" };

export default function CartPage() {
  const items = getCourses().slice(0, 3).filter((_, i) => i !== 1);
  const total = items.reduce((s, c) => s + c.price, 0);
  const discount = 200000;
  return (
    <>
      <PageHero
        title="سبد خرید"
        crumbs={[{ href: "/", label: "خانه" }, { label: "سبد خرید" }]}
      />
      <div className="shell grid gap-8 py-10 lg:grid-cols-[1fr_360px] lg:py-12">
        <div className="space-y-4">
          {items.map((c) => (
            <article key={c.slug} className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5 sm:flex-row">
              <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl sm:w-52">
                <Image src={c.image} alt={c.title} fill sizes="220px" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col">
                <p className="text-xs font-bold text-teal-600">دوره آنلاین</p>
                <h2 className="mt-1 leading-8 font-extrabold text-navy-900">{c.title}</h2>
                <p className="mt-1 text-sm text-ink-500">{c.instructor} • {toFa(c.sessions)} جلسه</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-lg font-black text-navy-900">{formatPrice(c.price)}</span>
                  <span className="flex items-center gap-2">
                    <Link href={`/courses/${c.slug}`} className="text-[13px] font-bold text-ink-500 hover:text-navy-800">
                      مشاهده دوره
                    </Link>
                    <button type="button" aria-label={`حذف ${c.shortTitle}`} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-madder-700 transition-colors hover:bg-madder-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              </div>
            </article>
          ))}
          <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700">
            <ArrowRight className="h-4 w-4" />
            ادامه خرید و مشاهده دوره‌های بیشتر
          </Link>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl bg-card p-6 shadow-lift ring-1 ring-ink-900/5">
            <h2 className="font-black text-navy-900">خلاصه سفارش</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-600">جمع ({toFa(items.length)} دوره)</dt><dd className="font-bold">{formatPrice(total)}</dd></div>
              <div className="flex justify-between text-teal-700"><dt>تخفیف ثبت‌نام هم‌زمان</dt><dd className="font-bold">− {formatPrice(discount)}</dd></div>
              <div className="flex justify-between border-t border-dashed border-ink-900/10 pt-3 text-base"><dt className="font-extrabold text-navy-900">مبلغ نهایی</dt><dd className="font-black text-navy-900">{formatPrice(total - discount)}</dd></div>
            </dl>
            <form className="mt-4 flex gap-2" action="/cart">
              <label htmlFor="coupon" className="sr-only">کد تخفیف</label>
              <input id="coupon" placeholder="کد تخفیف" className="h-11 min-w-0 flex-1 rounded-xl border border-ink-900/10 bg-sand-50 px-4 text-sm focus:border-teal-600 focus:outline-none" />
              <button type="submit" className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-800 transition-colors hover:bg-sand-300">
                <BadgePercent className="h-4 w-4" />
                اعمال
              </button>
            </form>
            <Button href="/auth" size="lg" className="mt-4 w-full">ادامه و پرداخت</Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              پرداخت امن • ۷ روز ضمانت بازگشت
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
