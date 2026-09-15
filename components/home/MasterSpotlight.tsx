import Image from "next/image";
import { Quote } from "lucide-react";
import { getInstructors } from "@/lib/store";
import { Button } from "../ui/Button";

export function MasterSpotlight() {
  const instructors = getInstructors();
  const master = instructors.find((i) => i.featured && i.active !== false) ?? instructors[0];
  return (
    <section className="bg-sand-50" aria-labelledby="master">
      <div className="section-pad shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative order-2 lg:order-1">
          <div className="absolute -inset-3 rounded-[28px] bg-navy-800/5" aria-hidden />
          <div className="relative overflow-hidden rounded-3xl shadow-lift">
            <Image
              src={master.image}
              alt={master.name}
              width={720}
              height={860}
              className="aspect-[5/6] w-full object-cover object-top"
            />
          </div>
          <div className="absolute -bottom-5 left-6 rounded-2xl bg-navy-900 px-5 py-3 text-white shadow-lift">
            <p className="text-2xl font-black">۳۲ سال</p>
            <p className="text-xs text-white/70">تجربه بافت و آموزش</p>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="text-sm font-bold text-madder-700">— بنیان‌گذار و استاد اصلی</p>
          <h2 id="master" className="mt-3 text-3xl leading-snug font-black text-navy-900 lg:text-4xl lg:leading-snug">
            {master.name}
          </h2>
          <p className="mt-2 font-bold text-ochre-700">{master.specialty}</p>
          <blockquote className="relative mt-5 rounded-2xl bg-card p-6 pr-12 shadow-card ring-1 ring-ink-900/5">
            <Quote className="absolute top-5 right-5 h-6 w-6 text-ochre-500" aria-hidden />
            <p className="leading-9 text-ink-700">
              «من از دوازده‌سالگی پای دار نشسته‌ام و هنوز هر روز چیزی تازه یاد می‌گیرم.
              در این سال‌ها یک چیز را فهمیدم: فرش‌بافی فقط تکنیک نیست؛ صبر، دقت و عشق است.
              این‌جا همان چیزی را یاد می‌گیرید که من از پدر و پدربزرگم یاد گرفتم — بدون کم‌وکاست.»
            </p>
          </blockquote>
          <dl className="mt-6 grid grid-cols-3 gap-4 text-center">
            {[
              { v: "۸۶۰+", l: "هنرجو" },
              { v: "۴", l: "دوره تخصصی" },
              { v: "۲۰۰+", l: "اثر مرمت‌شده" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-card px-2 py-4 shadow-card ring-1 ring-ink-900/5">
                <dd className="text-xl font-black text-navy-800 sm:text-2xl">{s.v}</dd>
                <dt className="mt-1 text-xs text-ink-500">{s.l}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-6">
            <Button href="/instructors" size="lg">
              آشنایی با استاد
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
