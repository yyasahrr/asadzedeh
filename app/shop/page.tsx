import type { Metadata } from "next";
import Link from "next/link";
import { Hammer, ShieldCheck, Truck, Wrench } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ProductCard } from "@/components/cards/ProductCard";
import { getActiveProducts, getSettings } from "@/lib/store";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const shop = getSettings().shop;
  return { title: shop.title || "فروشگاه لوازم بافت", description: shop.description };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ cat?: string; kind?: string }> }) {
  const { cat, kind } = await searchParams;
  const shop = getSettings().shop;
  const all = getActiveProducts();
  const categories = Array.from(new Set(all.map((p) => p.category)));
  const products = all.filter((p) => (!cat || p.category === cat) && (!kind || p.kind === kind));
  const featured = all.filter((p) => p.featured);

  return (
    <>
      <PageHero
        title={shop.title || "فروشگاه لوازم بافت"}
        description={shop.description || "دار قالی، ابزار، نخ و نقشه؛ همان ابزاری که سر کلاس‌های اسدزاده استفاده می‌شود."}
        crumbs={[{ href: "/", label: "خانه" }, { label: "فروشگاه" }]}
      />
      <div className="shell py-10 lg:py-12">
        {!shop.enabled && (
          <div className="mb-8 rounded-2xl bg-ochre-100/60 px-5 py-4 text-sm font-bold text-ochre-800 ring-1 ring-ochre-600/20">
            فروشگاه موقتاً غیرفعال است؛ می‌توانید محصولات را ببینید اما ثبت سفارش ممکن نیست.
          </div>
        )}

        {/* Trust strip */}
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Truck, title: "ارسال به سراسر کشور", desc: shop.freeShippingOver > 0 ? `ارسال رایگان برای سفارش‌های بالای ${toFa(Math.round(shop.freeShippingOver / 1000000))} میلیون تومان` : "تیپاکس، پست و باربری" },
            { icon: Hammer, title: "ساخت سفارشی در کارگاه", desc: "دار قالی با ابعاد دلخواه؛ ثبت پیش‌سفارش و پرداخت بیعانه" },
            { icon: ShieldCheck, title: "تأیید استاد", desc: "همه ابزارها در کلاس‌های حضوری آزمایش شده‌اند" },
          ].map((t) => (
            <div key={t.title} className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><t.icon className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-black text-navy-900">{t.title}</p>
                <p className="mt-0.5 text-xs leading-6 text-ink-600">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Link href="/shop" className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${!cat && !kind ? "bg-navy-800 text-white" : "bg-sand-100 text-ink-700 hover:bg-sand-200"}`}>همه ({toFa(all.length)})</Link>
          {categories.map((c) => (
            <Link key={c} href={`/shop?cat=${encodeURIComponent(c)}`} className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${cat === c ? "bg-navy-800 text-white" : "bg-sand-100 text-ink-700 hover:bg-sand-200"}`}>
              {c}
            </Link>
          ))}
          <Link href="/shop?kind=preorder" className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${kind === "preorder" ? "bg-ochre-600 text-white" : "bg-ochre-100/60 text-ochre-800 hover:bg-ochre-100"}`}>
            <Wrench className="h-3.5 w-3.5" /> ساخت سفارشی
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl bg-card p-12 text-center text-sm text-ink-500 shadow-card">محصولی در این دسته یافت نشد.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}

        {/* Preorder CTA */}
        {featured.some((p) => p.kind === "preorder") && !kind && (
          <section className="persian-corner mt-12 overflow-hidden rounded-3xl bg-navy-900 p-8 text-white shadow-lift lg:p-10">
            <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-bold text-ochre-200">پیش‌سفارش ساخت</p>
                <h2 className="mt-2 text-2xl font-black">دار قالی به اندازه‌ای که شما می‌خواهید</h2>
                <p className="mt-3 max-w-2xl text-sm leading-8 text-white/75">{shop.preorderIntro}</p>
              </div>
              <Link href="/shop?kind=preorder" className="inline-flex h-12 items-center justify-center rounded-xl bg-ochre-400 px-8 font-bold text-navy-900 transition-colors hover:bg-ochre-300">
                مشاهده محصولات سفارشی
              </Link>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
