import Image from "next/image";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import type { Article } from "@/lib/types";
import { toFa } from "@/lib/format";
import { Badge } from "../ui/Badge";
import { cn } from "@/lib/utils";

export function ArticleCard({ article, className }: { article: Article; className?: string }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift",
        className
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="moss">{article.category}</Badge>
          <span className="inline-flex items-center gap-1 text-xs text-ink-500">
            <Clock3 className="h-3.5 w-3.5" />
            {toFa(article.minutes)} دقیقه
          </span>
        </div>
        <h3 className="leading-8 font-extrabold text-navy-900 transition-colors group-hover:text-navy-700">
          {article.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-7 text-ink-600">{article.excerpt}</p>
        <span className="mt-auto pt-2 text-xs text-ink-400">{article.date}</span>
      </div>
    </Link>
  );
}
