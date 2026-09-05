import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getArticles } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Denied } from "@/components/admin/Denied";
import { deleteArticle } from "../actions";

export const metadata: Metadata = { title: "مقالات" };

export default async function AdminBlogPage() {
  const user = await getSessionUser();
  if (!can(user, "blog")) return <Denied />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">مقالات دانشنامه</h1>
        <Link href="/admin/blog/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700">
          <Plus className="h-4 w-4" />
          مقاله جدید
        </Link>
      </div>
      <TableShell head={["عنوان", "دسته", "تاریخ", "مطالعه", "عملیات"]}>
        {getArticles().map((a) => (
          <tr key={a.slug} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-900">{a.title}</Td>
            <Td className="whitespace-nowrap text-ink-600">{a.category}</Td>
            <Td className="whitespace-nowrap text-ink-600">{a.date}</Td>
            <Td className="font-bold">{toFa(a.minutes)} دقیقه</Td>
            <Td>
              <span className="flex items-center gap-1">
                <Link
                  href={`/admin/blog/${a.slug}/edit`}
                  aria-label={`ویرایش ${a.title}`}
                  title="ویرایش"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-800 transition-colors hover:bg-navy-50"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <DeleteButton action={deleteArticle} hidden={{ name: "slug", value: a.slug }} label={a.title} />
              </span>
            </Td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}
