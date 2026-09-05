import Image from "next/image";
import { Award, PlayCircle, UsersRound } from "lucide-react";
import { Button } from "../ui/Button";
import { Stars } from "../ui/Stars";
import { getCourses, getSettings } from "@/lib/store";
import { toFa } from "@/lib/format";

export function Hero() {
  const hero = getSettings().site.hero;
  const students = getCourses().reduce((s, c) => s + c.students, 0);

  return (
    <section className="bg-lattice relative overflow-hidden">
      <div className="shell grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-14 lg:py-20">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-[13px] font-bold text-navy-800 shadow-card ring-1 ring-ink-900/5">
            <span className="h-2 w-2 rounded-full bg-teal-600" aria-hidden />
            {hero.badge}
          </span>
          <h1 className="mt-5 font-display text-4xl leading-[1.5] font-black text-balance text-navy-950 sm:text-5xl sm:leading-[1.45]">
            {hero.titleA}
            <span className="text-madder-700"> {hero.titleHighlight} </span>
            {hero.titleB}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-9 text-ink-600 sm:text-lg sm:leading-9">
            {hero.subtitle}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button href="/courses" size="lg" className="sm:min-w-52">
              <PlayCircle className="h-5 w-5" />
              {hero.primaryCta}
            </Button>
            <Button href="/classes" size="lg" variant="outline" className="sm:min-w-44">
              {hero.secondaryCta}
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-600">
            <span className="inline-flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-teal-600" />
              <strong className="text-navy-900">+{toFa(students)} هنرجو</strong> در حال یادگیری
            </span>
            <span className="inline-flex items-center gap-2">
              <Stars value={4.9} />
              <span className="text-ink-500">رضایت هنرجویان</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Award className="h-4 w-4 text-ochre-600" />
              گواهی پایان دوره
            </span>
          </div>
        </div>

        <div className="relative animate-fade-in">
          <div className="absolute -inset-3 rounded-[28px] border-2 border-dashed border-ochre-600/40" aria-hidden />
          <div className="relative overflow-hidden rounded-3xl shadow-lift">
            <Image
              src={hero.image}
              alt="کارگاه بافت اسدزاده"
              width={880}
              height={660}
              priority
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent" />
            <p className="absolute right-4 bottom-4 left-4 text-sm leading-7 font-semibold text-white">
              {hero.note}
            </p>
          </div>
          <div className="absolute -bottom-5 right-6 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-lift ring-1 ring-ink-900/5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Award className="h-5 w-5" />
            </span>
            <span>
              <strong className="block text-sm text-navy-900">+۱۵ سال تجربه آموزش</strong>
              <span className="text-xs text-ink-500">سه نسل بافندگی</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
