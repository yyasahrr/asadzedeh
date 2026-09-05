import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Droplets, Grid2x2, Layers, PenTool, Wrench, type LucideIcon } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/Button";
import { learningPaths } from "@/lib/data";
import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "مسیرهای آموزشی",
  description: "مسیرهای قدم‌به‌قدم یادگیری فرش‌بافی، گلیم‌بافی، طراحی نقشه، رنگرزی و مرمت.",
};

const icons: Record<string, LucideIcon> = {
  "start-carpet": Grid2x2,
  "start-kilim": Layers,
  "map-design": PenTool,
  dyeing: Droplets,
  restoration: Wrench,
};

const accents = {
  navy: "bg-navy-800",
  teal: "bg-teal-600",
  madder: "bg-madder-700",
  ochre: "bg-ochre-600",
  moss: "bg-moss-700",
} as const;

const steps: Record<string, string[]> = {
  "start-carpet": ["شناخت ابزار و آماده‌سازی فضای بافت", "دوره فرش‌بافی مقدماتی + تمرین روزانه", "نقشه‌خوانی و بافت قالیچه لچک‌ترنج", "پرداخت حرفه‌ای و فروش اولین اثر"],
  "start-kilim": ["شناخت دار گلیم و چله‌کشی ساده", "دوره گلیم‌بافی مقدماتی", "بافت ورنی و جاجیم + فروش اول"],
  "map-design": ["شناخت نقوش و هندسه فرش", "دوره طراحی نقشه + تمرین آبرنگ", "نقطه‌چین و آماده‌سازی نقشه تجاری"],
  dyeing: ["مبانی الیاف و دندانه", "دوره رنگرزی سنتی + ساخت پالت", "نیل و رنگ‌های پیشرفته"],
  restoration: ["مبانی بافت و آسیب‌شناسی", "دوره مرمت + تمرین رفو", "شیرازه و ریشه + گرفتن سفارش واقعی", "برند شخصی مرمت‌کار"],
};

const firstCourse: Record<string, string> = {
  "start-carpet": "/courses/carpet-weaving-foundations",
  "start-kilim": "/courses/kilim-weaving-start",
  "map-design": "/courses/carpet-design-map",
  dyeing: "/courses/natural-dyeing",
  restoration: "/courses/carpet-restoration",
};

export default function PathsPage() {
  return (
    <>
      <PageHero
        title="مسیرهای آموزشی"
        description="به‌جای خرید پراکنده دوره، یک مسیر را تا انتها بروید؛ هر مسیر ترکیبی از دوره آنلاین، تمرین و ارزیابی استاد است."
        crumbs={[{ href: "/", label: "خانه" }, { label: "مسیرهای آموزشی" }]}
      />
      <div className="shell space-y-6 py-10 lg:py-12">
        {learningPaths.map((p) => {
          const Icon = icons[p.slug] ?? Layers;
          return (
            <article
              key={p.slug}
              className="grid gap-6 rounded-3xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:p-8 lg:grid-cols-[1fr_1.2fr] lg:gap-10"
            >
              <div>
                <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-white", accents[p.accent])}>
                  <Icon className="h-7 w-7" />
                </span>
                <h2 className="mt-4 text-2xl font-black text-navy-900">{p.title}</h2>
                <p className="mt-2 leading-8 text-ink-600">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[13px] font-bold">
                  <span className="rounded-full bg-sand-100 px-3.5 py-1.5 text-ink-700">{toFa(p.steps)} مرحله</span>
                  <span className="rounded-full bg-sand-100 px-3.5 py-1.5 text-ink-700">{toFa(p.courses)} دوره</span>
                  <span className="rounded-full bg-sand-100 px-3.5 py-1.5 text-ink-700">{p.duration}</span>
                </div>
                <Button href={firstCourse[p.slug]} className="mt-5">
                  شروع این مسیر
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
              <ol className="space-y-0 self-center">
                {(steps[p.slug] ?? []).map((s, i, arr) => (
                  <li key={s} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < arr.length - 1 && (
                      <span className="absolute top-8 right-[15px] h-[calc(100%-2rem)] w-0.5 bg-ink-900/10" aria-hidden />
                    )}
                    <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[13px] font-black text-white">
                      {toFa(i + 1)}
                    </span>
                    <p className="pt-1 text-[15px] leading-7 font-semibold text-ink-700">{s}</p>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}

        <div className="rounded-3xl bg-navy-900 bg-lattice-light p-8 text-center sm:p-10">
          <h2 className="text-xl font-black text-white sm:text-2xl">نمی‌دانید کدام مسیر مناسب شماست؟</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-white/70">
            در مشاوره رایگان ۱۵ دقیقه‌ای، هدفتان را می‌سنجیم و دقیق‌ترین مسیر را پیشنهاد می‌دهیم.
          </p>
          <Link
            href="/about"
            className="mt-5 inline-flex h-11 items-center rounded-xl bg-ochre-600 px-8 font-bold text-white transition-colors hover:bg-ochre-500"
          >
            رزرو مشاوره رایگان
          </Link>
        </div>
      </div>
    </>
  );
}
