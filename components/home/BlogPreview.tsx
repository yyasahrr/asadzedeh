import { articles } from "@/lib/data";
import { ArticleCard } from "../cards/ArticleCard";
import { SectionHeading } from "../ui/SectionHeading";

export function BlogPreview() {
  return (
    <section className="section-pad shell pt-0" aria-labelledby="blog-preview">
      <SectionHeading
        eyebrow="دانشنامه"
        title="دانشنامه فرش و گلیم"
        description="راهنماهای خرید، شناخت نقوش، رنگ‌شناسی و تجربه‌های کارگاه؛ رایگان بخوانید."
        link={{ href: "/blog", label: "مشاهده همه مقالات" }}
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {articles.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>
    </section>
  );
}
