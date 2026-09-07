import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "قوانین استفاده" };

export default function RulesPage() {
  const { legal } = getSettings();
  const page = legal.pages.find((p) => p.slug === "rules");

  return (
    <>
      <PageHero
        title={page?.title ?? "قوانین استفاده"}
        crumbs={[{ href: "/", label: "خانه" }, { label: "قوانین استفاده" }]}
      />
      <div className="shell py-10 lg:py-14">
        <article className="prose prose-slate max-w-3xl mx-auto">
          {page?.content ? (
            <div className="whitespace-pre-wrap">{page.content}</div>
          ) : (
            <p className="text-ink-600">محتوای این صفحه هنوز تنظیم نشده است.</p>
          )}
          {page?.lastUpdated && (
            <p className="mt-8 text-sm text-ink-400">آخرین بروزرسانی: {page.lastUpdated}</p>
          )}
        </article>
      </div>
    </>
  );
}
