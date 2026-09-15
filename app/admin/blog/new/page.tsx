import type { Metadata } from "next";
import { createArticle } from "../../actions";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { Denied } from "@/components/admin/Denied";
import { getSessionUser, can } from "@/lib/auth";

export const metadata: Metadata = { title: "مقاله جدید" };

export default async function NewArticlePage() {
  const user = await getSessionUser();
  if (!can(user, "blog")) return <Denied />;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">مقاله جدید</h1>
      <ArticleForm action={createArticle} submitLabel="انتشار مقاله" />
    </div>
  );
}
