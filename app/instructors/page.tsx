import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/PageHero";
import { InstructorCard } from "@/components/cards/InstructorCard";
import { Button } from "@/components/ui/Button";
import { toFa } from "@/lib/format";
import { getCourses, getInstructors } from "@/lib/store";

export const metadata: Metadata = {
  title: "اساتید",
  description: "با استادکاران و مدرسان اسدزاده آشنا شوید؛ نسل‌ها تجربه بافت پشت هر دوره.",
};

export const dynamic = "force-dynamic";

export default function InstructorsPage() {
  const instructors = getInstructors().filter((i) => i.active !== false);
  const courses = getCourses();
  const [master, ...rest] = instructors;
  const masterCourses = courses.filter((c) => c.instructorSlug === master?.slug).length || master?.courses || 0;
  return (
    <>
      <PageHero
        title="اساتید اسدزاده"
        description="ما مدرس استخدام نمی‌کنیم؛ استادکار دعوت می‌کنیم. هر دوره را کسی تدریس می‌کند که سال‌ها همان کار را کرده است."
        crumbs={[{ href: "/", label: "خانه" }, { label: "اساتید" }]}
      />
      <div className="shell py-10 lg:py-12">
        {/* Master feature */}
        <article id={master.slug} className="grid gap-8 rounded-3xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:p-8 lg:grid-cols-[320px_1fr] lg:gap-10">
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
             <h2 className="mt-2 text-3xl font-black text-navy-900">{master.name}</h2>
            <p className="mt-1 font-bold text-ochre-700">{master.specialty} • {master.experience} تجربه</p>
            <p className="mt-4 leading-9 text-ink-700">{master.bio}</p>
            {(master.about?.length ? master.about : ["ناصر اسد زاده نوه حاج‌قربان اسدزاده، از بافندگان قدیمی تبریز است. او علاوه بر بافت، بیش از ۲۰۰ فرش عتیقه را مرمت کرده و شاگردانش امروز در ۱۴ استان ایران کارگاه دارند."]).map((para) => (
              <p key={para} className="mt-3 leading-9 text-ink-700">{para}</p>
            ))}
            <dl className="mt-5 grid max-w-md grid-cols-3 gap-3 text-center">
              {[
                { v: `${toFa(master.students)}+`, l: "هنرجو" },
                { v: toFa(masterCourses), l: "دوره" },
                { v: master.experience, l: "تجربه" },
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

         <h2 className="mt-12 mb-6 text-xl font-black text-navy-900">دیگر مدرسان</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {rest.map((i) => (
            <div key={i.slug} id={i.slug} className="scroll-mt-28">
              <InstructorCard instructor={i} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
