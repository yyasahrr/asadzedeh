import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Hammer, Percent, Store, Truck, TriangleAlert } from "lucide-react";
import { submitPreorder } from "../actions";
import { PageHero } from "@/components/PageHero";
import { ProductCard } from "@/components/cards/ProductCard";
import { ProductBuyBox } from "@/components/shop/ProductBuyBox";
import { Badge } from "@/components/ui/Badge";
import { FieldLabel, Input, Textarea } from "@/components/ui/Input";
import { getSessionUser } from "@/lib/auth";
import { formatPrice, toFa } from "@/lib/format";
import { getActiveProducts, getProduct, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  return p ? { title: p.title, description: p.excerpt } : { title: "محصول" };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { slug } = await params;
  const { error } = await searchParams;
  const p = getProduct(slug);
  if (!p || !p.active) notFound();
  const shop = getSettings().shop;
  const user = await getSessionUser();
  const methods = shop.shippingMethods.filter((m) => m.active && p.shippingMethods.includes(m.id));
  const related = getActiveProducts().filter((x) => x.slug !== p.slug && x.category === p.category).slice(0, 4);
  const depositPercent = p.preorder?.depositPercent ?? shop.preorderDepositPercent;

  return (
    <>
      <PageHero title={p.title} crumbs={[{ href: "/", label: "خانه" }, { href: "/shop", label: "فروشگاه" }, { label: p.title }]} compact />
      <div className="shell py-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-card">
              <Image src={p.image} alt={p.title} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
              {p.badge && <span className="absolute top-4 right-4 rounded-full bg-madder-700 px-3 py-1 text-xs font-bold text-white">{p.badge}</span>}
            </div>
            {p.gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {p.gallery.slice(0, 4).map((g, i) => (
                  <div key={g + i} className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-ink-900/5">
                    <Image src={g} alt={`${p.title} ${i + 1}`} fill sizes="160px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buy box */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="navy">{p.category}</Badge>
              {p.kind === "preorder" ? <Badge tone="ochre"><Hammer className="h-3 w-3" /> ساخت سفارشی در کارگاه</Badge> : p.stock > 0 ? <Badge tone="teal">موجود</Badge> : <Badge tone="madder">ناموجود</Badge>}
            </div>
            <p className="text-base leading-8 text-ink-700">{p.excerpt}</p>

            <div className="rounded-3xl bg-card p-6 shadow-lift ring-1 ring-ink-900/5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  {p.oldPrice && p.oldPrice > p.price && <p className="text-sm text-ink-400 line-through">{formatPrice(p.oldPrice)}</p>}
                  <p className="text-2xl font-black text-navy-900">
                    {p.kind === "preorder" && <span className="text-sm font-bold text-ink-500">قیمت پایه از </span>}
                    {formatPrice(p.price)}
                  </p>
                </div>
                {p.kind === "preorder" && (
                  <div className="text-left text-xs text-ink-600">
                    <p className="flex items-center gap-1"><Percent className="h-3.5 w-3.5" /> بیعانه {toFa(depositPercent)}٪</p>
                    <p className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {toFa(p.preorder?.leadTimeDays ?? 21)} روز کاری</p>
                  </div>
                )}
              </div>
              <div className="mt-5">
                {p.kind === "physical" ? (
                  <ProductBuyBox product={p} disabled={!shop.enabled} />
                ) : (
                  <a href="#preorder" className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-navy-800 font-bold text-white transition-colors hover:bg-navy-700">
                    <Hammer className="h-5 w-5" /> ثبت پیش‌سفارش ساخت
                  </a>
                )}
              </div>
              {methods.length > 0 && (
                <ul className="mt-5 space-y-1.5 border-t border-dashed border-ink-900/10 pt-4 text-xs text-ink-600">
                  {methods.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5">{m.id === "pickup" ? <Store className="h-3.5 w-3.5 text-teal-700" /> : <Truck className="h-3.5 w-3.5 text-teal-700" />} {m.label} <span className="text-ink-400">• {m.etaDays}</span></span>
                      <span className="font-bold">{m.cost === 0 ? "رایگان" : formatPrice(m.cost)}</span>
                    </li>
                  ))}
                  {shop.freeShippingOver > 0 && <li className="text-teal-700">ارسال رایگان برای سفارش‌های بالای {formatPrice(shop.freeShippingOver)}</li>}
                </ul>
              )}
            </div>

            {p.specs.length > 0 && (
              <dl className="grid gap-2 rounded-2xl bg-sand-50 p-5 text-sm sm:grid-cols-2">
                {p.specs.map((s) => (
                  <div key={s.label} className="flex justify-between gap-3 border-b border-ink-900/5 pb-2 last:border-0 sm:last:border-b sm:[&:nth-last-child(2)]:border-0">
                    <dt className="text-ink-500">{s.label}</dt>
                    <dd className="font-bold text-ink-800">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {/* Description */}
        {p.description.length > 0 && (
          <section className="mt-12 max-w-3xl">
            <h2 className="mb-4 text-xl font-black text-navy-900">درباره این محصول</h2>
            <div className="space-y-4 text-[15px] leading-9 text-ink-700">
              {p.description.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* Preorder form */}
        {p.kind === "preorder" && (
          <section id="preorder" className="mt-12 grid gap-6 lg:grid-cols-[1fr_380px]">
            <form action={submitPreorder} className="space-y-5 rounded-3xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 lg:p-8">
              <input type="hidden" name="slug" value={p.slug} />
              <div>
                <h2 className="text-xl font-black text-navy-900">فرم پیش‌سفارش ساخت</h2>
                <p className="mt-1 text-sm leading-7 text-ink-600">{p.preorder?.note || shop.preorderIntro}</p>
              </div>
              {error && (
                <p className="flex items-center gap-2 rounded-xl bg-madder-50 px-4 py-3 text-sm font-bold text-madder-700">
                  <TriangleAlert className="h-4 w-4" />
                  {error === "validation" ? "نام و شماره موبایل معتبر (۰۹…) الزامی است." : error === "disabled" ? "فروشگاه موقتاً غیرفعال است." : "خطایی رخ داد."}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="po-name">نام و نام خانوادگی *</FieldLabel>
                  <Input id="po-name" name="name" required defaultValue={user?.name ?? ""} />
                </div>
                <div>
                  <FieldLabel htmlFor="po-phone">شماره موبایل *</FieldLabel>
                  <Input id="po-phone" name="phone" required inputMode="tel" defaultValue={user?.phone ?? ""} dir="ltr" className="text-left" placeholder="09123456789" />
                </div>
                {p.specs.map((s) => (
                  <div key={s.label}>
                    <FieldLabel htmlFor={`po-${s.label}`}>{s.label}</FieldLabel>
                    <Input id={`po-${s.label}`} name={`spec_${s.label}`} placeholder={`گزینه‌ها: ${s.value}`} />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="po-note">توضیحات و نیازهای خاص</FieldLabel>
                  <Textarea id="po-note" name="note" placeholder="مثلاً: برای بافت قالیچه ۱×۱٫۵ متر، محل نصب آپارتمان، ترجیحاً قابل جمع‌شدن…" />
                </div>
              </div>
              <button type="submit" disabled={!shop.enabled} className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy-800 font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-60">
                <Hammer className="h-5 w-5" /> ثبت درخواست پیش‌سفارش
              </button>
              <p className="text-center text-xs leading-6 text-ink-500">ثبت درخواست رایگان است. پس از تماس کارشناس و تأیید قیمت، لینک پرداخت بیعانه برایتان پیامک می‌شود.</p>
            </form>

            <aside className="space-y-4">
              <div className="rounded-3xl bg-navy-900 p-6 text-white shadow-lift">
                <h3 className="font-black">مراحل پیش‌سفارش</h3>
                <ol className="mt-4 space-y-3 text-sm">
                  {[
                    "ثبت درخواست با مشخصات دلخواه",
                    "تماس کارشناس و اعلام قیمت قطعی",
                    `پرداخت بیعانه ${toFa(depositPercent)}٪`,
                    `ساخت در کارگاه (${toFa(p.preorder?.leadTimeDays ?? 21)} روز کاری)`,
                    "تسویه و ارسال با باربری یا تحویل حضوری",
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ochre-400 text-xs font-black text-navy-900">{toFa(i + 1)}</span>
                      <span className="leading-6 text-white/85">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl bg-sand-50 p-5 text-sm leading-7 text-ink-600 ring-1 ring-ink-900/5">
                بیعانه تقریبی برای قیمت پایه: <b className="text-navy-900">{formatPrice(Math.round((p.price * depositPercent) / 100))}</b>
                <br />
                وضعیت سفارش را می‌توانید با کد پیگیری در <Link href="/shop/preorder" className="font-bold text-teal-700">صفحه پیگیری</Link> دنبال کنید.
              </div>
            </aside>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 text-xl font-black text-navy-900">محصولات مرتبط</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <ProductCard key={r.slug} product={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
