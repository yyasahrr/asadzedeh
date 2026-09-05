import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Clock3 } from "lucide-react";
import { articles } from "@/lib/data";
import { toFa } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { NewsletterForm } from "@/components/NewsletterForm";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  return { title: article ? article.title : "مقاله" };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();

  const related = articles.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <article className="shell py-10 lg:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700">
          <ArrowRight className="h-4 w-4" />
          بازگشت به دانشنامه
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge tone="moss">{article.category}</Badge>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-500">
            <Clock3 className="h-4 w-4" />
            {toFa(article.minutes)} دقیقه مطالعه • {article.date}
          </span>
        </div>
        <h1 className="mt-4 text-3xl leading-snug font-black text-balance text-navy-950 sm:text-4xl sm:leading-snug">
          {article.title}
        </h1>
        <p className="mt-3 text-lg leading-9 text-ink-600">{article.excerpt}</p>
      </div>

      <div className="mx-auto mt-7 max-w-4xl overflow-hidden rounded-3xl shadow-card">
        <Image src={article.image} alt={article.title} width={1200} height={630} className="aspect-[16/8] w-full object-cover" priority />
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-5">
        {article.body.map((p, i) => (
          <p key={i} className="text-[16px] leading-10 text-ink-700">{p}</p>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-3xl rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="font-black text-navy-900">این مقاله برایتان مفید بود؟</h2>
        <p className="mt-1 text-sm leading-7 text-ink-600">
          عضو خبرنامه شوید تا هر هفته مقاله‌های جدید دانشنامه را بگیرید.
        </p>
        <div className="mt-4">
          <NewsletterForm />
        </div>
      </div>

      <div className="mt-12">
        <h2 className="mb-6 text-xl font-black text-navy-900">مقالات مرتبط</h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {related.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </div>
    </article>
  );
}
