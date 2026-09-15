import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BookOpen, Clock, Users, Star, CheckCircle, GraduationCap, ShoppingCart } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/Button";
import { getLearningPath, getInstructor, getCourses } from "@/lib/store";
import { toFa, formatPriceCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "مسیر آموزشی" };
export const dynamic = "force-dynamic";

const accents = {
  navy: "bg-navy-800",
  teal: "bg-teal-600",
  madder: "bg-madder-700",
  ochre: "bg-ochre-600",
  moss: "bg-moss-700",
} as const;

const accentText = {
  navy: "text-navy-800",
  teal: "text-teal-600",
  madder: "text-madder-700",
  ochre: "text-ochre-600",
  moss: "text-moss-700",
} as const;

export default async function PathDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = getLearningPath(slug);
  
  if (!path) notFound();

  const courses = getCourses();
  const pathCourses = path.pathCourses.map((pc) => {
    const course = courses.find((c) => c.slug === pc.courseSlug);
    const instructor = course?.instructorSlug ? getInstructor(course.instructorSlug) : undefined;
    return { ...pc, course, instructor };
  });

  const totalDuration = pathCourses.reduce((sum, pc) => sum + (pc.course?.hours ?? 0), 0);
  const totalSessions = pathCourses.reduce((sum, pc) => sum + (pc.course?.sessions ?? 0), 0);
  const totalPrice = pathCourses.reduce((sum, pc) => sum + (pc.course?.price ?? 0), 0);
  const avgRating = pathCourses.reduce((sum, pc) => sum + (pc.course?.rating ?? 0), 0) / (pathCourses.length || 1);
  const totalStudents = pathCourses.reduce((sum, pc) => sum + (pc.course?.students ?? 0), 0);

  const accentClass = accents[path.accent] ?? "bg-navy-800";
  const accentClassText = accentText[path.accent] ?? "text-navy-800";

  const uniqueInstructors = Array.from(
    new Map(
      pathCourses
        .filter((pc) => pc.instructor)
        .map((pc) => [pc.instructor!.slug, pc.instructor!])
    ).values()
  );

  const allOutcomes = pathCourses.flatMap((pc) => pc.course?.outcomes ?? []);
  const allFaqs = pathCourses.flatMap((pc) => pc.course?.faq ?? []);
  const allChapters = pathCourses.flatMap((pc) => 
    (pc.course?.syllabus ?? []).map((ch) => ({ course: pc.course, chapter: ch }))
  );

  return (
    <>
      <PageHero
        title={path.title}
        description={path.description}
        crumbs={[{ href: "/", label: "خانه" }, { href: "/paths", label: "مسیرهای آموزشی" }, { label: path.title }]}
      />
      
      <div className="shell py-8 lg:py-12 space-y-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl bg-card p-6 shadow-card">
              <h2 className="text-lg font-black text-navy-900 mb-4">دوره‌های این مسیر به ترتیب</h2>
              <div className="space-y-4">
                {pathCourses.map((pc, index) => (
                  <div key={pc.courseSlug} className="relative">
                    {index < pathCourses.length - 1 && (
                      <div className="absolute right-[19px] top-12 bottom-0 w-0.5 bg-ink-200 z-0" />
                    )}
                    <div className="relative flex gap-4 p-4 rounded-xl border border-ink-200 bg-white hover:border-teal-300 transition-colors">
                      <div className="flex flex-col items-center gap-2">
                        <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-white font-black text-sm z-10", accentClass)}>
                          {toFa(index + 1)}
                        </span>
                        {pc.course?.rating && (
                          <div className="flex items-center gap-0.5 text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            <span className="text-xs font-bold">{pc.course.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-navy-900">{pc.course?.shortTitle || pc.courseSlug}</h3>
                            {pc.course?.category && (
                              <span className="inline-block mt-1 text-xs font-bold text-ink-500 bg-sand-100 px-2 py-0.5 rounded">
                                {pc.course.category}
                              </span>
                            )}
                          </div>
                          <span className="text-lg font-black text-teal-700 whitespace-nowrap">
                            {pc.course ? formatPriceCompact(pc.course.price) : "—"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-ink-600 line-clamp-2">
                          {pc.course?.excerpt}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                          {pc.course && (
                            <>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5" />
                                {toFa(pc.course.sessions)} جلسه
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {toFa(pc.course.hours)} ساعت
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {toFa(pc.course.students)} هنرجو
                              </span>
                            </>
                          )}
                        </div>
                        {pc.instructor && (
                          <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-sand-50">
                            <Image
                              src={pc.instructor.image} 
                              alt={pc.instructor.name}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-xs font-bold text-navy-900">{pc.instructor.name}</p>
                              <p className="text-[10px] text-ink-500">{pc.instructor.specialty}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {allOutcomes.length > 0 && (
              <section className="rounded-2xl bg-card p-6 shadow-card">
                <h2 className="text-lg font-black text-navy-900 mb-4">چی یاد می‌گیرید؟</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {allOutcomes.slice(0, 8).map((outcome, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className={cn("h-5 w-5 shrink-0 mt-0.5", accentClassText)} />
                      <span className="text-sm text-ink-700">{outcome}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {allChapters.length > 0 && (
              <section className="rounded-2xl bg-card p-6 shadow-card">
                <h2 className="text-lg font-black text-navy-900 mb-4">سرفصل‌های دوره‌ها</h2>
                <div className="space-y-4">
                  {pathCourses.map((pc, pIndex) => (
                    <div key={pc.courseSlug} className="border-b border-ink-100 pb-4 last:border-0 last:pb-0">
                      <h3 className="font-bold text-navy-900 mb-2">
                        {pIndex + 1}. {pc.course?.shortTitle}
                      </h3>
                      <div className="space-y-2">
                        {pc.course?.syllabus?.slice(0, 3).map((chapter, cIndex) => (
                          <div key={cIndex} className="bg-sand-50 rounded-lg p-3">
                            <p className="text-sm font-bold text-teal-700">{chapter.title}</p>
                            <ul className="mt-1 space-y-1">
                              {chapter.lessons.slice(0, 3).map((lesson, lIndex) => (
                                <li key={lIndex} className="flex items-center gap-2 text-xs text-ink-600">
                                  <span className="w-5 h-5 rounded-full bg-white border border-ink-200 flex items-center justify-center text-[10px] font-bold">
                                    {lIndex + 1}
                                  </span>
                                  {lesson}
                                </li>
                              ))}
                              {chapter.lessons.length > 3 && (
                                <li className="text-xs text-ink-400">
                                  + {toFa(chapter.lessons.length - 3)} درس دیگر
                                </li>
                              )}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-card p-6 shadow-card sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className={cn("h-6 w-6", accentClassText)} />
                <span className="font-black text-navy-900">{path.title}</span>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">تعداد دوره‌ها</span>
                  <span className="font-bold text-navy-900">{toFa(pathCourses.length)} دوره</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">مجموع جلسات</span>
                  <span className="font-bold text-navy-900">{toFa(totalSessions)} جلسه</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">مجموع ساعت</span>
                  <span className="font-bold text-navy-900">{toFa(totalDuration)} ساعت</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">مجموع هنرجویان</span>
                  <span className="font-bold text-navy-900">{toFa(totalStudents)} نفر</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">میانگین امتیاز</span>
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-current" />
                    {avgRating.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="border-t border-ink-200 pt-4 mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-teal-700">
                    {formatPriceCompact(path.fixedPrice ?? totalPrice)}
                  </span>
                  <span className="text-sm text-ink-500">تومان</span>
                </div>
                {path.discountPercentage && (
                  <div className="mt-1">
                    <span className="text-sm text-ink-400 line-through">
                      {formatPriceCompact(totalPrice)} تومان
                    </span>
                    <span className="mr-2 text-xs font-bold text-madder-600">
                      {toFa(path.discountPercentage)}٪ صرفه‌جویی
                    </span>
                  </div>
                )}
              </div>

              <Button href={`/shop/preorder?path=${path.slug}`} className="w-full justify-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                خرید این مسیر
              </Button>

              <div className="mt-4 space-y-2 text-xs text-ink-500">
                <p className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-teal-600" />
                  دسترسی مادام‌العمر به دوره‌ها
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-teal-600" />
                  آپدیت رایگان محتوا
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-teal-600" />
                  گواهی پایان دوره
                </p>
              </div>
            </div>

            {uniqueInstructors.length > 0 && (
              <div className="rounded-2xl bg-card p-6 shadow-card">
                <h3 className="font-black text-navy-900 mb-4">اساتید این مسیر</h3>
                <div className="space-y-4">
                  {uniqueInstructors.map((inst) => (
                    <div key={inst.slug} className="flex items-center gap-3">
                      <Image src={inst.image} alt={inst.name} width={56} height={56} className="w-14 h-14 rounded-full object-cover" />
                      <div>
                        <p className="font-bold text-navy-900">{inst.name}</p>
                        <p className="text-xs text-ink-500">{inst.specialty}</p>
                        <p className="text-xs text-ink-400">{toFa(inst.experience)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allFaqs.length > 0 && (
              <div className="rounded-2xl bg-card p-6 shadow-card">
                <h3 className="font-black text-navy-900 mb-4">سوالات متداول</h3>
                <div className="space-y-4">
                  {allFaqs.slice(0, 5).map((faq, i) => (
                    <details key={i} className="group">
                      <summary className="cursor-pointer text-sm font-bold text-navy-800 hover:text-teal-700">
                        <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white ml-2", accentClass)}>?</span>
                        {faq.q}
                      </summary>
                      <p className="mt-2 mr-7 text-sm text-ink-600">{faq.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
