import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Infinity as InfinityIcon,
  LayoutGrid,
  Lock,
  Minus,
  PlayCircle,
  Plus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { getCourse, getCourses, getSettings } from "@/lib/store";
import { formatPrice, formatPriceCompact, toFa } from "@/lib/format";
import { PageHero } from "@/components/PageHero";
import { Badge } from "@/components/ui/Badge";
import { Stars } from "@/components/ui/Stars";
import { CourseCard } from "@/components/cards/CourseCard";
import { Comments } from "@/components/comments/Comments";
import { ShareButton } from "@/components/ShareButton";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { TrailerBlock } from "@/components/video/TrailerBlock";
import { getSessionUser } from "@/lib/auth";
import { isEnrolled } from "@/lib/access";
import { getVideos } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return { title: "دوره" };
  return {
    title: course.shortTitle,
    description: course.excerpt,
    openGraph: { title: course.title, description: course.excerpt, type: "website" },
  };
}

const faqs = [
  {
    q: "اگر هیچ تجربه‌ای در بافت ندارم، می‌توانم شرکت کنم؟",
    a: "بله. دوره‌های مقدماتی از صفر شروع می‌شوند و فرض بر این است که هیچ ابزاری ندارید؛ لیست خرید و راهنمای آماده‌سازی هم داخل دوره هست.",
  },
  {
    q: "رفع‌اشکال چطور انجام می‌شود؟",
    a: "از اثر خود عکس می‌فرستید و استاد در کمتر از ۲۴ ساعت ایرادها را تصویری و صوتی توضیح می‌دهد. برای تمرین‌های مهم، جلسه تصویری هم هست.",
  },
  {
    q: "تا کی به ویدیوها دسترسی دارم؟",
    a: "برای همیشه. حتی آپدیت‌های بعدی دوره هم رایگان به حساب شما اضافه می‌شود.",
  },
  {
    q: "گواهی پایان دوره معتبر است؟",
    a: "بله. بعد از قبولی در ارزیابی نهایی، گواهی با مهر آموزشگاه و کد یکتا صادر می‌شود که در همین سایت قابل استعلام است.",
  },
];

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string }>;
}) {
  const { slug } = await params;
  const { comment } = await searchParams;
  const course = getCourse(slug);
  if (!course) notFound();

  const user = await getSessionUser();
  const enrolled = isEnrolled(user, course.slug);
  const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
  const chapters = Array.from(new Set(lessons.map((l) => l.chapterId))); 
  const chapterById = new Map((course.chapters ?? []).map((ch) => [ch.id, ch.title]));
  const freeCount = lessons.filter((l) => l.free).length;
  const videoIds = new Set(getVideos().filter((v) => v.status !== "failed").map((v) => v.id));

  const related = getCourses().filter((c) => c.slug !== course.slug).slice(0, 3);
  const siteUrl = getSettings().site.siteUrl.replace(/\/$/, "");
  const discount = course.oldPrice
    ? Math.round(((course.oldPrice - course.price) / course.oldPrice) * 100)
    : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.excerpt,
    provider: { "@type": "Organization", name: "اسدزاده", url: siteUrl },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      instructor: { "@type": "Person", name: course.instructor },
    },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <PageHero
        compact
        title={course.title}
        crumbs={[
          { href: "/", label: "خانه" },
          { href: "/courses", label: "دوره‌های آنلاین" },
          { label: course.shortTitle },
        ]}
      />

      <div className="shell grid gap-4 py-3 lg:grid-cols-[1fr_340px] lg:py-5">
        <div className="min-w-0 space-y-3">
          <div>
            <TrailerBlock trailer={course.trailer} image={course.image} title={course.title} badge={course.badge ?? (course.students === 0 ? "جدید" : undefined)} />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="navy">{course.category}</Badge>
              <Badge tone="sand">سطح {course.level}</Badge>
              <span className="ms-auto flex items-center gap-3">
                <Stars value={course.rating} />
                <ShareButton title={course.title} />
              </span>
            </div>

            <p className="mt-3 text-[15px] leading-8 text-ink-700">{course.excerpt}</p>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
              <span className="inline-flex items-center gap-1.5"><LayoutGrid className="h-4 w-4 text-teal-600" />{toFa(course.sessions)} جلسه</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-teal-600" />{toFa(course.hours)} ساعت آموزش</span>
              <span className="inline-flex items-center gap-1.5"><UsersRound className="h-4 w-4 text-teal-600" />{toFa(course.students)} هنرجو</span>
            </div>
          </div>

          <section className="rounded-xl bg-card p-4 ring-1 ring-ink-900/5" aria-labelledby="outcomes">
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

          <section aria-labelledby="syllabus">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="syllabus" className="text-lg font-black text-navy-900">سرفصل‌های دوره</h2>
              {lessons.length > 0 && (
                <span className="text-xs text-ink-500">
                  {toFa(lessons.length)} جلسه ویدیویی • {toFa(lessons.reduce((t, l) => t + l.durationMin, 0))} دقیقه
                  {freeCount > 0 && ` • ${toFa(freeCount)} پیش‌نمایش رایگان`}
                </span>
              )}
            </div>
            <div className="mt-2 space-y-2">
              {lessons.length > 0
                ? chapters.map((ch, i) => {
                    const items = lessons.filter((l) => l.chapterId === ch);
                    const chTitle = chapterById.get(ch) ?? ch;
                    return (
                      <details key={ch} open={i === 0} className="group overflow-hidden rounded-xl bg-card ring-1 ring-ink-900/5 open:ring-teal-600/30">
                        <summary className="flex items-center justify-between gap-3 p-4 font-extrabold text-navy-900">
                          <span className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sand-100 text-sm font-black text-navy-800">{toFa(i + 1)}</span>
                            {chTitle}
                            <span className="text-xs font-normal text-ink-400">({toFa(items.length)} جلسه)</span>
                          </span>
                          <span className="text-ink-400">
                            <Plus className="h-5 w-5 group-open:hidden" />
                            <Minus className="hidden h-5 w-5 group-open:block" />
                          </span>
                        </summary>
                        <ul className="space-y-1 border-t border-dashed border-ink-900/10 px-5 py-4">
                          {items.map((l) => {
                            const watchable = enrolled || l.free;
                            const hasVideo = !!l.videoId && videoIds.has(l.videoId);
                            const row = (
                              <>
                                <span className="flex items-center gap-2.5">
                                  {watchable ? <PlayCircle className="h-4 w-4 shrink-0 text-ochre-600" /> : <Lock className="h-4 w-4 shrink-0 text-ink-300" />}
                                  <span>{toFa(l.order)}. {l.title}</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  {l.free && !enrolled && <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">پیش‌نمایش رایگان</span>}
                                  {!hasVideo && <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-bold text-ink-500">به‌زودی</span>}
                                  <span className="text-xs text-ink-400">{toFa(l.durationMin)} دقیقه</span>
                                </span>
                              </>
                            );
                            return (
                              <li key={l.id} className="text-[15px] text-ink-700">
                                {watchable && hasVideo ? (
                                  <Link href={`/dashboard/courses/${course.slug}?lesson=${l.id}`} className="flex items-center justify-between gap-3 rounded-lg py-2 transition-colors hover:text-teal-700">{row}</Link>
                                ) : (
                                  <div className="flex items-center justify-between gap-3 py-2">{row}</div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    );
                  })
                : course.syllabus.map((ch, i) => (
                <details
                  key={ch.title}
                  open={i === 0}
                  className="group overflow-hidden rounded-xl bg-card ring-1 ring-ink-900/5 open:ring-teal-600/30"
                >
                  <summary className="flex items-center justify-between gap-3 p-4 font-extrabold text-navy-900">
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
            {enrolled && lessons.length > 0 && (
              <Link href={`/dashboard/courses/${course.slug}`} className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-6 text-sm font-bold text-white hover:bg-teal-700">
                <PlayCircle className="h-4 w-4" /> شما در این دوره ثبت‌نام کرده‌اید — ورود به کلاس
              </Link>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-ink-900/5 sm:flex-row sm:items-center" aria-label="مدرس دوره">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-lg font-black text-white">
              {course.instructor.replace("استاد ", "").charAt(0)}
            </span>
            <div className="flex-1">
              <p className="text-base font-black text-navy-900">{course.instructor}</p>
              <p className="mt-0.5 text-sm text-ink-600">{course.instructorRole} • پاسخ‌گویی به سوالات در کمتر از ۲۴ ساعت</p>
            </div>
            <Link href="/instructors" className="text-sm font-bold text-teal-600 hover:text-teal-700">
              مشاهده پروفایل ←
            </Link>
          </section>

          <section aria-labelledby="faq">
            <h2 id="faq" className="text-lg font-black text-navy-900">سؤالات پرتکرار</h2>
            <div className="mt-2 space-y-2">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-xl bg-card px-5 py-3.5 ring-1 ring-ink-900/5">
                  <summary className="flex items-center justify-between gap-3 font-extrabold text-navy-900">
                    {f.q}
                    <Plus className="h-5 w-5 shrink-0 text-ink-400 group-open:hidden" />
                    <Minus className="hidden h-5 w-5 shrink-0 text-ink-400 group-open:block" />
                  </summary>
                  <p className="mt-2 text-[15px] leading-8 text-ink-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <Comments scope="course" slug={course.slug} sent={comment === "sent"} />
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-xl bg-card shadow-lift ring-1 ring-ink-900/5">
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
              <div className="mt-5">
                {enrolled ? (
                  <Link href={`/dashboard/courses/${course.slug}`} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-bold text-white hover:bg-teal-700">
                    <PlayCircle className="h-4 w-4" /> شما قبلاً خریداری کرده‌اید — ورود به دوره
                  </Link>
                ) : (
                  <AddToCartButton
                    item={{
                      kind: "course",
                      slug: course.slug,
                      title: course.title,
                      price: course.price,
                      image: course.image,
                      meta: `${course.instructor} • ${toFa(course.sessions)} جلسه`,
                    }}
                  />
                )}
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

      {related.length > 0 && (
        <div className="bg-sand-50">
          <div className="shell py-8">
            <h2 className="mb-6 text-xl font-black text-navy-900">دوره‌های مرتبط</h2>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((c) => (
                <CourseCard key={c.slug} course={c} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
