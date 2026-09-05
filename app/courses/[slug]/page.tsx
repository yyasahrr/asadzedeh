import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Infinity as InfinityIcon,
  LayoutGrid,
  Minus,
  PlayCircle,
  Plus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { onlineCourses } from "@/lib/data";
import { formatPrice, formatPriceCompact, toFa } from "@/lib/format";
import { PageHero } from "@/components/PageHero";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { CourseCard } from "@/components/cards/CourseCard";

export function generateStaticParams() {
  return onlineCourses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = onlineCourses.find((c) => c.slug === slug);
  return { title: course ? course.shortTitle : "دوره" };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = onlineCourses.find((c) => c.slug === slug);
  if (!course) notFound();

  const related = onlineCourses.filter((c) => c.slug !== course.slug).slice(0, 3);
  const discount = course.oldPrice
    ? Math.round(((course.oldPrice - course.price) / course.oldPrice) * 100)
    : 0;

  return (
    <>
      <PageHero
        title={course.title}
        crumbs={[
          { href: "/", label: "خانه" },
          { href: "/courses", label: "دوره‌های آنلاین" },
          { label: course.shortTitle },
        ]}
      />

      <div className="shell grid gap-8 py-10 lg:grid-cols-[1fr_360px] lg:py-12">
        {/* Main */}
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-2xl shadow-card">
            <Image
              src={course.image}
              alt={course.title}
              width={1000}
              height={560}
              className="aspect-video w-full object-cover"
              priority
            />
            {course.badge && (
              <span className="absolute top-4 right-4 rounded-full bg-madder-700 px-4 py-1.5 text-sm font-bold text-white shadow-card">
                {course.badge}
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone="navy">{course.category}</Badge>
            <Badge tone="sand">سطح {course.level}</Badge>
            <span className="ms-auto"><Stars value={course.rating} /></span>
          </div>

          <p className="mt-4 text-[16px] leading-9 text-ink-700">{course.excerpt}</p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
            <span className="inline-flex items-center gap-1.5"><LayoutGrid className="h-4 w-4 text-teal-600" />{toFa(course.sessions)} جلسه</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-teal-600" />{toFa(course.hours)} ساعت آموزش</span>
            <span className="inline-flex items-center gap-1.5"><UsersRound className="h-4 w-4 text-teal-600" />{toFa(course.students)} هنرجو</span>
          </div>

          {/* Outcomes */}
          <section className="mt-8 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5" aria-labelledby="outcomes">
            <h2 id="outcomes" className="text-lg font-black text-navy-900">در پایان این دوره می‌توانید:</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {course.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-2 text-[15px] leading-7 text-ink-700">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-teal-600" />
                  {o}
                </li>
              ))}
            </ul>
          </section>

          {/* Syllabus */}
          <section className="mt-6" aria-labelledby="syllabus">
            <h2 id="syllabus" className="text-lg font-black text-navy-900">سرفصل‌های دوره</h2>
            <div className="mt-4 space-y-3">
              {course.syllabus.map((ch, i) => (
                <details
                  key={ch.title}
                  open={i === 0}
                  className="group overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5 open:ring-teal-600/30"
                >
                  <summary className="flex items-center justify-between gap-3 p-5 font-extrabold text-navy-900">
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sand-100 text-sm font-black text-navy-800">
                        {toFa(i + 1)}
                      </span>
                      {ch.title}
                    </span>
                    <span className="text-ink-400">
                      <Plus className="h-5 w-5 group-open:hidden" />
                      <Minus className="hidden h-5 w-5 group-open:block" />
                    </span>
                  </summary>
                  <ul className="space-y-1 border-t border-dashed border-ink-900/10 px-5 py-4">
                    {ch.lessons.map((l, j) => (
                      <li key={l} className="flex items-center justify-between gap-3 py-2 text-[15px] text-ink-700">
                        <span className="flex items-center gap-2.5">
                          <PlayCircle className="h-4 w-4 shrink-0 text-ochre-600" />
                          {l}
                        </span>
                        {i === 0 && j === 0 ? (
                          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">پیش‌نمایش رایگان</span>
                        ) : (
                          <span className="text-xs text-ink-400">{toFa(12 + j * 4)} دقیقه</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          {/* Instructor */}
          <section className="mt-6 flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:flex-row sm:items-center" aria-label="مدرس دوره">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-xl font-black text-white">
              {course.instructor.replace("استاد ", "").charAt(0)}
            </span>
            <div className="flex-1">
              <p className="font-extrabold text-navy-900">{course.instructor}</p>
              <p className="mt-1 text-sm text-ink-600">{course.instructorRole} • پاسخ‌گویی به سوالات در کمتر از ۲۴ ساعت</p>
            </div>
            <Link href="/instructors" className="text-sm font-bold text-teal-600 hover:text-teal-700">
              مشاهده پروفایل ←
            </Link>
          </section>
        </div>

        {/* Buy card */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-2xl bg-card shadow-lift ring-1 ring-ink-900/5">
            <div className="pattern-strip" aria-hidden />
            <div className="p-6">
              {discount > 0 && (
                <p className="mb-2 inline-flex rounded-full bg-madder-50 px-3 py-1 text-xs font-bold text-madder-700">
                  ٪{toFa(discount)} تخفیف ثبت‌نام زودهنگام
                </p>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-navy-900">{formatPriceCompact(course.price)}</span>
                {course.oldPrice && (
                  <span className="text-sm text-ink-400 line-through">{formatPrice(course.oldPrice)}</span>
                )}
              </div>
              <div className="mt-5 space-y-2.5">
                <Button href="/cart" size="lg" className="w-full">افزودن به سبد خرید</Button>
                <Button href="/dashboard" variant="outline" className="w-full">شروع یادگیری (پیش‌نمایش)</Button>
              </div>
              <ul className="mt-5 space-y-2.5 border-t border-dashed border-ink-900/10 pt-5 text-sm text-ink-700">
                <li className="flex items-center gap-2"><InfinityIcon className="h-4 w-4 text-teal-600" /> دسترسی مادام‌العمر به ویدیوها</li>
                <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-teal-600" /> گواهی پایان دوره با امضای استاد</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-600" /> ۷ روز ضمانت بازگشت وجه</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* Related */}
      <div className="bg-sand-50">
        <div className="shell py-12">
          <h2 className="mb-6 text-xl font-black text-navy-900">دوره‌های مرتبط</h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((c) => (
              <CourseCard key={c.slug} course={c} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
