import Link from "next/link";
import { jsonLd as jsonLdString  } from "@/lib/seo";
import { appUrl } from "@/lib/env";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, CalendarDays, CheckCircle2, Clock3, MapPin, Minus, Plus, UsersRound } from "lucide-react";
import { getClass, getClasses, getInstructors } from "@/lib/store";
import { getClassInstructorSlugs } from "@/lib/instructors";
import { formatPrice, toFa } from "@/lib/format";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/Button";
import { InPersonCourseCard } from "@/components/cards/InPersonCourseCard";
import { Comments } from "@/components/comments/Comments";
import { ShareButton } from "@/components/ShareButton";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WorkshopLocation } from "@/components/workshop/WorkshopLocation";
import { TrailerBlock } from "@/components/video/TrailerBlock";
import { hasPaidClassAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { availableSeats } from "@/lib/stock";
import { formatJalaliDateLong } from "@/lib/jalali-date";

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
  const effectiveFaqs = cls.faq?.length ? cls.faq : faqs;

  const user = await getSessionUser();
  const alreadyOwned = hasPaidClassAccess(user, slug);

  const related = getClasses().filter((c) => c.slug !== cls.slug).slice(0, 2);
  const siteUrl = appUrl();
  const instructorProfiles = getClassInstructorSlugs(cls)
    .map((slug) => getInstructors().find((item) => item.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const instructorNames = instructorProfiles.length ? instructorProfiles.map((item) => item.name) : [cls.instructor];
  // Seats a shopper can still take: open seats minus unpaid reservations.
  const seats = availableSeats(cls);
  const urgent = seats <= 3;
  const lessons = [...(cls.lessons ?? [])].sort((a, b) => a.order - b.order);
  const chapters = Array.from(new Set(lessons.map((lesson) => lesson.chapterId)));
  const chapterById = new Map((cls.chapters ?? []).map((ch) => [ch.id, ch.title]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: cls.title,
    description: cls.excerpt,
    provider: { "@type": "Organization", name: "اسدزاده", url: siteUrl },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "onsite",
      instructor: instructorNames.map((name) => ({ "@type": "Person", name })),
      location: { "@type": "Place", name: cls.location },
    },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: effectiveFaqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqLd) }} />
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

            <section className="rounded-xl bg-card p-4 ring-1 ring-ink-900/5" aria-label="تیم مدرسان کلاس">
              <h2 className="mb-3 font-black text-navy-900">تیم مدرسان</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(instructorProfiles.length ? instructorProfiles : [{ slug: "", name: cls.instructor, specialty: "مدرس کارگاه اسدزاده" }]).map((instructor) => (
                  <div key={instructor.slug || instructor.name} className="flex items-center gap-3 rounded-lg bg-sand-50 p-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-lg font-black text-white">{instructor.name.replace("استاد ", "").charAt(0)}</span>
                    <div className="min-w-0 flex-1"><p className="font-black text-navy-900">{instructor.name}</p><p className="truncate text-sm text-ink-600">{instructor.specialty}</p></div>
                    <Link href={instructor.slug ? `/instructors#${instructor.slug}` : "/instructors"} className="text-xs font-bold text-teal-600 hover:text-teal-700">پروفایل ←</Link>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-xl bg-card p-4 ring-1 ring-ink-900/5" aria-label="برنامه کلاس">
            <h2 className="font-black text-navy-900">برنامه کلاس</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { icon: CalendarDays, k: "تاریخ شروع", v: formatJalaliDateLong(cls.startDate) },
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

          {cls.sessionSchedule?.length ? (
            <section className="rounded-xl bg-card p-4 ring-1 ring-ink-900/5" aria-labelledby="class-session-schedule">
              <h2 id="class-session-schedule" className="font-black text-navy-900">تقویم جلسات</h2>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {cls.sessionSchedule.map((session, index) => (
                  <li key={session.id} className="rounded-xl bg-sand-100 px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <strong className="text-navy-900">جلسه {toFa(index + 1)}{session.title ? ` — ${session.title}` : ""}</strong>
                      {session.status !== "scheduled" ? <span className="rounded-full bg-card px-2 py-0.5 text-xs text-ink-600">{session.status === "cancelled" ? "لغوشده" : session.status === "postponed" ? "به‌تعویق‌افتاده" : "برگزارشده"}</span> : null}
                    </div>
                    <p className="mt-1 text-ink-600">{formatJalaliDateLong(session.date)}، {session.startTime} تا {session.endTime}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {lessons.length > 0 ? (
            <section className="rounded-xl bg-card p-4 ring-1 ring-ink-900/5" aria-labelledby="class-curriculum-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="class-curriculum-title" className="flex items-center gap-2 font-black text-navy-900">
                    <BookOpen className="h-5 w-5 text-teal-700" /> سرفصل‌ها و برنامه جلسات
                  </h2>
                  <p className="mt-1 text-xs text-ink-500">{toFa(chapters.length)} فصل • {toFa(lessons.length)} جلسه</p>
                </div>
                <Link href={`/dashboard/classes/${cls.slug}`} className="text-xs font-bold text-teal-700 hover:underline">
                  محتوای هنرجویان ←
                </Link>
              </div>
              <div className="mt-4 space-y-2">
                {chapters.map((chapter, chapterIndex) => {
                  const chapterLessons = lessons.filter((lesson) => lesson.chapterId === chapter);
                  const chTitle = chapterById.get(chapter) ?? chapter;
                  return (
                    <details key={chapter} open={chapterIndex === 0} className="group overflow-hidden rounded-xl border border-ink-900/8">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 bg-sand-50 px-4 py-3 font-extrabold text-navy-900">
                        <span>{chTitle}</span>
                        <span className="text-xs font-semibold text-ink-500">{toFa(chapterLessons.length)} جلسه</span>
                      </summary>
                      <ol className="divide-y divide-ink-900/5">
                        {chapterLessons.map((lesson) => (
                          <li key={lesson.id} className="flex items-start gap-3 px-4 py-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-xs font-black text-white">{toFa(lesson.order)}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-ink-800">{lesson.title}</p>
                              {lesson.description ? <p className="mt-1 line-clamp-2 text-xs leading-6 text-ink-500">{lesson.description}</p> : null}
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
                {seats <= 0
                  ? "ظرفیت تکمیل شد"
                  : urgent
                    ? `تنها ${toFa(seats)} ظرفیت باقی مانده`
                    : `${toFa(seats)} ظرفیت باقی مانده از ${toFa(cls.capacity)}`}
              </p>
              <div className="mt-3 text-2xl font-black">{formatPrice(cls.price)}</div>
              <p className="mt-1 text-xs text-white/60">امکان پرداخت در دو قسط</p>
              <div className="mt-5">
                {alreadyOwned ? (
                  <Link href={`/dashboard/classes/${cls.slug}`} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-bold text-white hover:bg-teal-700">
                    <BookOpen className="h-4 w-4" /> شما قبلاً ثبت‌نام کرده‌اید — ورود به کلاس
                  </Link>
                ) : seats <= 0 ? (
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
