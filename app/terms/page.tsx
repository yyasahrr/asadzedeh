import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "قوانین و مقررات" };

export default function TermsPage() {
  const { legal } = getSettings();
  const page = legal.pages.find((p) => p.slug === "terms");

  return (
    <>
      <PageHero
        title={page?.title ?? "قوانین و مقررات"}
        crumbs={[{ href: "/", label: "خانه" }, { label: "قوانین و مقررات" }]}
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
