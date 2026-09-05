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
    <section className="bg-lattice relative overflow-hidden pb-8 pt-7 sm:pt-10">
      <div className="shell grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="bento-surface animate-fade-up flex flex-col justify-center p-6 sm:p-9 lg:p-11">
          <span className="glass-surface inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-bold text-navy-800">
            <span className="h-2 w-2 rounded-full bg-teal-600" aria-hidden />
            {hero.badge}
          </span>
          <h1 className="mt-5 text-4xl leading-[1.35] font-black tracking-tight text-balance text-navy-950 sm:text-5xl sm:leading-[1.3]">
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
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ink-900/8 pt-5 text-sm text-ink-600">
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

        <div className="relative animate-fade-in overflow-hidden rounded-[28px] bg-navy-900 p-2 shadow-lift">
          <div className="relative h-full min-h-[390px] overflow-hidden rounded-[22px] sm:min-h-[520px]">
            <Image
              src={hero.image}
              alt="کارگاه بافت اسدزاده"
              width={880}
              height={660}
              priority
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent" />
            <p className="absolute right-5 bottom-5 left-5 max-w-md text-sm leading-7 font-semibold text-white">
              {hero.note}
            </p>
          </div>
          <div className="glass-surface absolute left-5 top-5 flex items-center gap-3 rounded-2xl px-4 py-3">
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
