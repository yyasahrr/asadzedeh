import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, CalendarDays, CheckCircle2, Clock3, FileText, MapPin, Minus, PlayCircle, Plus, UsersRound } from "lucide-react";
import { getClass, getClasses, getSettings } from "@/lib/store";
import { formatPriceCompact, toFa } from "@/lib/format";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/Button";
import { InPersonCourseCard } from "@/components/cards/InPersonCourseCard";
import { Comments } from "@/components/comments/Comments";
import { ShareButton } from "@/components/ShareButton";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WorkshopLocation } from "@/components/workshop/WorkshopLocation";
import { TrailerBlock } from "@/components/video/TrailerBlock";

export function generateStaticParams() {
  return getClasses().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cls = getClass(slug);
  if (!cls) return { title: "کلاس حضوری" };
  return {
    title: cls.title,
    description: cls.excerpt,
    openGraph: { title: cls.title, description: cls.excerpt, type: "website" },
  };
}

const faqs = [
  {
    q: "آیا ابزار و مواد اولیه با خودم بیاورم؟",
    a: "خیر. دار، ابزار و مواد جلسات اول در کارگاه موجود است؛ لیست وسایل شخصی (مثل دفتر یادداشت) بعد از ثبت‌نام پیامک می‌شود.",
  },
  {
    q: "اگر یک جلسه غیبت کنم چه می‌شود؟",
    a: "تا دو جلسه غیبت موجه با هماهنگی، در کلاس موازی جبران می‌شود. خلاصه هر جلسه هم در گروه هنرجویان منتشر می‌شود.",
  },
  {
    q: "آیا امکان پرداخت اقساطی هست؟",
    a: "بله. شهریه کلاس‌های حضوری در دو قسط (ثبت‌نام و میانه دوره) قابل پرداخت است.",
  },
  {
    q: "کارگاه کجاست و جای پارک دارد؟",
    a: "کارگاه در ارومیه، خیابان امام، خیابان عطایی و کوی دی (نجارخانه) قرار دارد. کروکی و نشانه‌های مسیر در همین صفحه آمده است؛ برای هماهنگی جای پارک پیش از مراجعه تماس بگیرید.",
  },
];

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string }>;
}) {
  const { slug } = await params;
  const { comment } = await searchParams;
  const cls = getClass(slug);
  if (!cls) notFound();

  const related = getClasses().filter((c) => c.slug !== cls.slug).slice(0, 2);
  const siteUrl = getSettings().site.siteUrl.replace(/\/$/, "");
  const urgent = cls.remaining <= 3;
  const lessons = [...(cls.lessons ?? [])].sort((a, b) => a.order - b.order);
  const chapters = Array.from(new Set(lessons.map((lesson) => lesson.chapter)));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: cls.title,
    description: cls.excerpt,
    provider: { "@type": "Organization", name: "اسدزاده", url: siteUrl },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "onsite",
      instructor: { "@type": "Person", name: cls.instructor },
      location: { "@type": "Place", name: cls.location },
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
        title={cls.title}
        crumbs={[
          { href: "/", label: "خانه" },
          { href: "/classes", label: "دوره‌های حضوری" },
          { label: cls.title },
        ]}
      />

      <div className="shell grid gap-4 py-3 lg:grid-cols-[1fr_340px] lg:py-5">
        <div className="min-w-0 space-y-3">
          <div>
            <TrailerBlock trailer={cls.trailer} image={cls.image} title={cls.title} />
            <div className="mt-3 flex justify-end">
              <ShareButton title={cls.title} />
            </div>
            <p className="mt-2 text-[15px] leading-8 text-ink-700">{cls.excerpt}</p>

            <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-ink-900/5 sm:flex-row sm:items-center" aria-label="مدرس کلاس">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-lg font-black text-white">
                {cls.instructor.replace("استاد ", "").charAt(0)}
              </span>
              <div className="flex-1">
                <p className="text-base font-black text-navy-900">{cls.instructor}</p>
                <p className="mt-0.5 text-sm text-ink-600">مدرس کارگاه اسدزاده در ارومیه</p>
              </div>
              <Link href="/instructors" className="text-sm font-bold text-teal-600 hover:text-teal-700">
                مشاهده پروفایل ←
              </Link>
            </section>
          </div>

          <section className="rounded-xl bg-card p-4 ring-1 ring-ink-900/5" aria-label="برنامه کلاس">
            <h2 className="font-black text-navy-900">برنامه کلاس</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { icon: CalendarDays, k: "تاریخ شروع", v: cls.startDate },
                { icon: Clock3, k: "روزها و ساعت", v: `${cls.days} • ${cls.time}` },
                { icon: UsersRound, k: "تعداد جلسات", v: `${toFa(cls.sessions)} جلسه` },
                { icon: MapPin, k: "محل برگزاری", v: cls.location },
              ].map(({ icon: Icon, k, v }) => (
                <div key={k} className="flex items-center gap-3 rounded-xl bg-sand-100 px-4 py-3">
                  <Icon className="h-5 w-5 shrink-0 text-teal-600" />
                  <div>
                    <dt className="text-xs text-ink-500">{k}</dt>
                    <dd className="text-sm font-extrabold text-navy-900">{v}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm leading-7 text-ink-600">
              مدرس: <strong className="text-navy-900">{cls.instructor}</strong>
            </p>
          </section>

          {lessons.length > 0 ? (
            <section className="rounded-xl bg-card p-4 ring-1 ring-ink-900/5" aria-labelledby="class-curriculum-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="class-curriculum-title" className="flex items-center gap-2 font-black text-navy-900">
                    <BookOpen className="h-5 w-5 text-teal-700" /> فصل‌ها و برنامه آموزشی
                  </h2>
                  <p className="mt-1 text-xs text-ink-500">{toFa(chapters.length)} فصل • {toFa(lessons.length)} درس</p>
                </div>
                <Link href={`/dashboard/classes/${cls.slug}`} className="text-xs font-bold text-teal-700 hover:underline">
                  محتوای هنرجویان ←
                </Link>
              </div>
              <div className="mt-4 space-y-2">
                {chapters.map((chapter, chapterIndex) => {
                  const chapterLessons = lessons.filter((lesson) => lesson.chapter === chapter);
                  return (
                    <details key={chapter} open={chapterIndex === 0} className="group overflow-hidden rounded-xl border border-ink-900/8">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 bg-sand-50 px-4 py-3 font-extrabold text-navy-900">
                        <span>{chapter}</span>
                        <span className="text-xs font-semibold text-ink-500">{toFa(chapterLessons.length)} درس</span>
                      </summary>
                      <ol className="divide-y divide-ink-900/5">
                        {chapterLessons.map((lesson) => (
                          <li key={lesson.id} className="flex items-start gap-3 px-4 py-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-xs font-black text-white">{toFa(lesson.order)}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-ink-800">{lesson.title}</p>
                              {lesson.description ? <p className="mt-1 line-clamp-2 text-xs leading-6 text-ink-500">{lesson.description}</p> : null}
                              <p className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-ink-500">
                                {lesson.videoId ? <span className="inline-flex items-center gap-1"><PlayCircle className="h-3.5 w-3.5" /> ویدیوی تکمیلی</span> : null}
                                {lesson.attachments?.length ? <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {toFa(lesson.attachments.length)} فایل</span> : null}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </details>
                  );
                })}
              </div>
            </section>
          ) : null}

          <WorkshopLocation />

          <section className="rounded-xl bg-card p-4 ring-1 ring-ink-900/5" aria-label="امکانات">
            <h2 className="font-black text-navy-900">شهریه شامل چه چیزهایی است؟</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {cls.includes.map((inc) => (
                <li key={inc} className="flex items-center gap-2 text-[15px] text-ink-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" />
                  {inc}
                </li>
              ))}
            </ul>
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

          <Comments scope="class" slug={cls.slug} sent={comment === "sent"} />
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-xl bg-navy-900 text-white shadow-lift">
            <div className="pattern-strip" aria-hidden />
            <div className="p-6">
              <p className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${urgent ? "bg-madder-700" : "bg-teal-600"}`}>
                {cls.remaining <= 0
                  ? "ظرفیت تکمیل شد"
                  : urgent
                    ? `تنها ${toFa(cls.remaining)} ظرفیت باقی مانده`
                    : `${toFa(cls.remaining)} ظرفیت باقی مانده از ${toFa(cls.capacity)}`}
              </p>
              <div className="mt-3 text-2xl font-black">{formatPriceCompact(cls.price)}</div>
              <p className="mt-1 text-xs text-white/60">امکان پرداخت در دو قسط</p>
              <div className="mt-5">
                {cls.remaining <= 0 ? (
                  <Button href="/classes" variant="sand" size="lg" className="w-full">مشاهده کلاس‌های دیگر</Button>
                ) : (
                  <AddToCartButton
                    label="ثبت‌نام در کلاس"
                    className="bg-madder-700 hover:bg-madder-600"
                    item={{
                      kind: "class",
                      slug: cls.slug,
                      title: cls.title,
                      price: cls.price,
                      image: cls.image,
                      meta: `${cls.days} • ${cls.time}`,
                    }}
                  />
                )}
              </div>
              <p className="mt-4 text-[13px] leading-6 text-white/60">
                کلاس در کارگاه ارومیه برگزار می‌شود؛ آدرس و کروکی در همین صفحه در دسترس است و جزئیات وسایل لازم پیامک می‌شود.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <div className="bg-sand-50">
          <div className="shell py-8">
            <h2 className="mb-6 text-xl font-black text-navy-900">کلاس‌های دیگر</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {related.map((c) => (
                <InPersonCourseCard key={c.slug} cls={c} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
