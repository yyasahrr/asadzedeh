import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateArticle } from "../../../actions";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { Denied } from "@/components/admin/Denied";
import { getSessionUser, can } from "@/lib/auth";
import { getArticle } from "@/lib/store";

export const metadata: Metadata = { title: "ویرایش مقاله" };

export default async function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!can(user, "blog")) return <Denied />;
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">ویرایش مقاله</h1>
      <ArticleForm action={updateArticle} initial={article} submitLabel="ذخیره تغییرات" />
    </div>
  );
}
