import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getCourses, getLearningPath, getLearningPathCoursesTotal } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { EditLearningPathForm } from "./EditLearningPathForm";

export const metadata: Metadata = { title: "ویرایش مسیر آموزشی" };

export default async function EditLearningPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !can(user, "courses")) return <Denied />;

  const { slug } = await params;
  const { error } = await searchParams;
  const path = getLearningPath(slug);
  if (!path) redirect("/admin/learning-paths");

  const courses = getCourses().map((c) => ({
    slug: c.slug,
    shortTitle: c.shortTitle,
    price: c.price,
  }));
  const coursesTotal = getLearningPathCoursesTotal(path);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/learning-paths" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-50">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-black text-navy-900">ویرایش: {path.title}</h1>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{decodeURIComponent(error)}</p>
      )}

      <EditLearningPathForm
        slug={path.slug}
        title={path.title}
        description={path.description}
        icon={path.icon}
        accent={path.accent}
        duration={path.duration}
        active={path.active}
        courses={courses}
        initialPathCourses={path.pathCourses}
        initialPricingMode={path.pricingMode}
        initialFixedPrice={path.fixedPrice}
        initialDiscountPercentage={path.discountPercentage}
        initialCoursesTotal={coursesTotal}
      />
    </div>
  );
}
