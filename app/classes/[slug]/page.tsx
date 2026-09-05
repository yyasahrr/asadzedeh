import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, Clock3, MapPin, UsersRound } from "lucide-react";
import { getClass, getClasses } from "@/lib/store";
import { formatPriceCompact, toFa } from "@/lib/format";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/Button";
import { InPersonCourseCard } from "@/components/cards/InPersonCourseCard";

export function generateStaticParams() {
  return getClasses().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cls = getClass(slug);
  return { title: cls ? cls.title : "کلاس حضوری" };
}

export default async function ClassDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cls = getClass(slug);
  if (!cls) notFound();

  const related = getClasses().filter((c) => c.slug !== cls.slug).slice(0, 2);
  const urgent = cls.remaining <= 3;

  return (
    <>
      <PageHero
        title={cls.title}
        crumbs={[
          { href: "/", label: "خانه" },
          { href: "/classes", label: "دوره‌های حضوری" },
          { label: cls.title },
        ]}
      />

      <div className="shell grid gap-8 py-10 lg:grid-cols-[1fr_360px] lg:py-12">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl shadow-card">
            <Image src={cls.image} alt={cls.title} width={1000} height={560} className="aspect-video w-full object-cover" priority />
          </div>
          <p className="mt-5 text-[16px] leading-9 text-ink-700">{cls.excerpt}</p>

          <section className="mt-6 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5" aria-label="برنامه کلاس">
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

          <section className="mt-6 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5" aria-label="امکانات">
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
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-2xl bg-navy-900 text-white shadow-lift">
            <div className="pattern-strip" aria-hidden />
            <div className="p-6">
              <p className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${urgent ? "bg-madder-700" : "bg-teal-600"}`}>
                {urgent ? `تنها ${toFa(cls.remaining)} ظرفیت باقی مانده` : `${toFa(cls.remaining)} ظرفیت باقی مانده از ${toFa(cls.capacity)}`}
              </p>
              <div className="mt-3 text-2xl font-black">{formatPriceCompact(cls.price)}</div>
              <p className="mt-1 text-xs text-white/60">امکان پرداخت در دو قسط</p>
              <div className="mt-5">
                <Button href="/cart" variant="highlight" size="lg" className="w-full">ثبت‌نام در کلاس</Button>
              </div>
              <p className="mt-4 text-[13px] leading-6 text-white/60">
                بعد از ثبت‌نام، هماهنگی‌های کارگاه (آدرس دقیق، وسایل لازم و گروه هنرجویان) پیامک می‌شود.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <div className="bg-sand-50">
          <div className="shell py-12">
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
