import { Quote } from "lucide-react";
import { testimonials } from "@/lib/data";
import { SectionHeading } from "../ui/SectionHeading";
import { Stars } from "../ui/Stars";

export function Testimonials() {
  return (
    <section className="section-pad shell" aria-labelledby="testimonials">
      <SectionHeading
        eyebrow="نظر هنرجویان"
        title="کسانی که از این راه رفته‌اند"
        description="میانگین امتیاز ۴٫۹ از ۵ در نظرسنجی پایان دوره؛ این فقط چند نمونه است."
      />
      <div className="grid gap-5 md:grid-cols-3">
        {testimonials.map((t) => (
          <blockquote
            key={t.name}
            className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5"
          >
            <Quote className="h-7 w-7 text-ochre-500" aria-hidden />
            <p className="flex-1 text-[15px] leading-8 text-ink-700">«{t.text}»</p>
            <footer className="flex items-center justify-between border-t border-dashed border-ink-900/10 pt-4">
              <div>
                <p className="text-sm font-extrabold text-navy-900">{t.name}</p>
                <p className="mt-0.5 text-xs text-ink-500">{t.role}</p>
              </div>
              <Stars value={5} />
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
