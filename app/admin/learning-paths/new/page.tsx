import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCourses } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { NewLearningPathForm } from "@/components/admin/NewLearningPathForm";

export const metadata: Metadata = { title: "مسیر آموزشی جدید" };

export default async function NewLearningPathPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !can(user, "courses")) return <Denied />;

  const { error } = await searchParams;
  const courses = getCourses().map((c) => ({
    slug: c.slug,
    shortTitle: c.shortTitle,
    price: c.price,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/learning-paths" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-50">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-black text-navy-900">مسیر آموزشی جدید</h1>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{decodeURIComponent(error)}</p>
      )}

      <NewLearningPathForm courses={courses} />
    </div>
  );
}
