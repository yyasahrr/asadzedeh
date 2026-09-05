import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/PageHero";
import { InstructorCard } from "@/components/cards/InstructorCard";
import { Button } from "@/components/ui/Button";
import { instructors } from "@/lib/data";

export const metadata: Metadata = {
  title: "اساتید",
  description: "با استادکاران و مدرسان اسدزاده آشنا شوید؛ نسل‌ها تجربه بافت پشت هر دوره.",
};

export default function InstructorsPage() {
  const [master, ...rest] = instructors;
  return (
    <>
      <PageHero
        title="اساتید اسدزاده"
        description="ما مدرس استخدام نمی‌کنیم؛ استادکار دعوت می‌کنیم. هر دوره را کسی تدریس می‌کند که سال‌ها همان کار را کرده است."
        crumbs={[{ href: "/", label: "خانه" }, { label: "اساتید" }]}
      />
      <div className="shell py-10 lg:py-12">
        {/* Master feature */}
        <article className="grid gap-8 rounded-3xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:p-8 lg:grid-cols-[320px_1fr] lg:gap-10">
          <div className="overflow-hidden rounded-2xl">
            <Image
              src={master.image}
              alt={master.name}
              width={640}
              height={760}
              className="aspect-[5/6] w-full object-cover object-top"
            />
          </div>
          <div className="self-center">
            <p className="text-sm font-bold text-madder-700">بنیان‌گذار و استاد اصلی</p>
             <h2 className="mt-2 font-display text-3xl font-black text-navy-900">{master.name}</h2>
            <p className="mt-1 font-bold text-ochre-700">{master.specialty} • {master.experience} تجربه</p>
            <p className="mt-4 leading-9 text-ink-700">{master.bio}</p>
            <p className="mt-3 leading-9 text-ink-700">
              ناصر اسد زاده نوه حاج‌قربان اسدزاده، از بافندگان قدیمی تبریز است. او علاوه بر بافت،
              بیش از ۲۰۰ فرش عتیقه را مرمت کرده و شاگردانش امروز در ۱۴ استان ایران کارگاه دارند.
            </p>
            <dl className="mt-5 grid max-w-md grid-cols-3 gap-3 text-center">
              {[
                { v: "۸۶۰+", l: "هنرجو" },
                { v: "۴", l: "دوره" },
                { v: "۱۵+", l: "سال تدریس" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-sand-100 px-2 py-3">
                  <dd className="text-lg font-black text-navy-800">{s.v}</dd>
                  <dt className="mt-0.5 text-xs text-ink-500">{s.l}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-5">
              <Button href="/courses">دوره‌های استاد اسدزاده</Button>
            </div>
          </div>
        </article>

         <h2 className="mt-12 mb-6 font-display text-xl font-black text-navy-900">دیگر مدرسان</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {rest.map((i) => (
            <InstructorCard key={i.slug} instructor={i} />
          ))}
        </div>
      </div>
    </>
  );
}
