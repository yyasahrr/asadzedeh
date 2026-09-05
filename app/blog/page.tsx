import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { Badge } from "@/components/ui/Badge";
import { articles } from "@/lib/data";
import { toFa } from "@/lib/format";

export const metadata: Metadata = {
  title: "دانشنامه فرش و گلیم",
  description: "مقالات رایگان شناخت فرش، رنگ‌شناسی، راهنمای خرید و تجربه‌های کارگاه.",
};

export default function BlogPage() {
  const [featured, ...rest] = articles;
  return (
    <>
      <PageHero
        title="دانشنامه فرش و گلیم"
        description="هر هفته دو مقاله کاربردی: از شناخت نقوش و رنگ تا راهنمای خرید ابزار و فروش اثر."
        crumbs={[{ href: "/", label: "خانه" }, { label: "دانشنامه" }]}
      />
      <div className="shell py-10 lg:py-12">
        {/* Featured */}
        <Link
          href={`/blog/${featured.slug}`}
          className="group grid overflow-hidden rounded-3xl bg-card shadow-card ring-1 ring-ink-900/5 transition-shadow hover:shadow-lift lg:grid-cols-2"
        >
          <div className="relative min-h-64 overflow-hidden">
            <Image
              src={featured.image}
              alt={featured.title}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
          <div className="flex flex-col justify-center gap-3 p-6 sm:p-10">
            <div className="flex items-center gap-3">
              <Badge tone="madder">منتخب سردبیر</Badge>
              <Badge tone="moss">{featured.category}</Badge>
            </div>
            <h2 className="text-2xl leading-snug font-black text-navy-900 transition-colors group-hover:text-navy-700">
              {featured.title}
            </h2>
            <p className="leading-8 text-ink-600">{featured.excerpt}</p>
            <p className="flex items-center gap-2 text-[13px] text-ink-500">
              <Clock3 className="h-4 w-4" />
              {toFa(featured.minutes)} دقیقه مطالعه • {featured.date}
            </p>
          </div>
        </Link>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rest.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </div>
    </>
  );
}
