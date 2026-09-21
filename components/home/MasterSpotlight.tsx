import Image from "next/image";
import { Quote } from "lucide-react";
import { getInstructors, getSettings } from "@/lib/store";
import { normalizeHomeContent } from "@/lib/site-content";
import { Button } from "../ui/Button";

export function MasterSpotlight() {
  const content = normalizeHomeContent(getSettings().site.home).spotlight;
  if (!content.enabled) return null;
  const instructors = getInstructors();
  const master =
    instructors.find((item) => item.slug === content.instructorSlug && item.active !== false) ??
    instructors.find((item) => item.featured && item.active !== false) ??
    instructors.find((item) => item.active !== false) ??
    instructors[0];
  if (!master) return null;
  const experience = master.experience?.trim() || "سابقه حرفه‌ای";

  return (
    <section className="bg-sand-50" aria-labelledby="master">
      <div className="section-pad shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative order-2 lg:order-1">
          <div className="relative overflow-hidden rounded-3xl shadow-lift">
            <Image src={master.image} alt={master.name} width={720} height={860} className="aspect-[5/6] w-full object-cover object-top" />
          </div>
          <div className="absolute -bottom-5 left-6 rounded-2xl bg-navy-900 px-5 py-3 text-white">
            <p className="text-2xl font-black">{experience}</p>
            <p className="text-xs text-white/70">{content.experienceLabel}</p>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-sm font-bold text-madder-700">{content.eyebrow}</p>
          <h2 id="master" className="mt-3 text-3xl font-black text-navy-900 lg:text-4xl">{master.name}</h2>
          <p className="mt-2 font-bold text-ochre-700">{master.specialty}</p>
          <blockquote className="relative mt-5 rounded-2xl bg-card p-6 pr-12 shadow-card ring-1 ring-ink-900/5">
            <Quote className="absolute top-5 right-5 h-6 w-6 text-ochre-500" aria-hidden />
            <p className="leading-9 text-ink-700">«{content.quote}»</p>
          </blockquote>
          <dl className="mt-6 grid grid-cols-3 gap-4 text-center">
            {content.stats.filter((item) => item.active !== false).map((stat) => (
              <div key={stat.id} className="rounded-2xl bg-card px-2 py-4">
                <dd className="text-xl font-black text-navy-800 sm:text-2xl">{stat.value}</dd>
                <dt className="mt-1 text-xs text-ink-500">{stat.label}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-6"><Button href={content.ctaHref} size="lg">{content.ctaLabel}</Button></div>
        </div>
      </div>
    </section>
  );
}
