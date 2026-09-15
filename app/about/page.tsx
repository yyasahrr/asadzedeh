import type { Metadata } from "next";
import Image from "next/image";
import { GraduationCap, HandHeart, Leaf, Medal } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/Button";
import { stats } from "@/lib/data";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = {
  title: "درباره ما",
  description: "داستان سه نسل بافندگی خانواده اسدزاده؛ از دار قالی پدربزرگ تا پلتفرم آموزش آنلاین.",
};

const timeline = [
  { year: "۱۳۴۸", text: "حاج‌قربان اسدزاده اولین دار خانوادگی را در تبریز برپا می‌کند." },
  { year: "۱۳۷۵", text: "نسل دوم، کارگاه مرمت را در ارومیه راه می‌اندازد." },
  { year: "۱۳۹۰", text: "اولین کلاس‌های آموزشی حضوری با ۶ هنرجو برگزار می‌شود." },
  { year: "۱۳۹۹", text: "آموزش آنلاین شروع می‌شود؛ هنرجویان از ۱۴ استان." },
  { year: "۱۴۰۵", text: "بیش از ۱۲۰۰ هنرجو، ۳۵ دوره و یک کارگاه ۴۰۰ متری." },
];

const values = [
  { icon: HandHeart, title: "اصالت", text: "همان تکنیک‌های سنتی، بدون میان‌بر؛ چیزی که از استادانمان یاد گرفتیم." },
  { icon: GraduationCap, title: "آموزش واقعی", text: "تمرین، رفع‌اشکال و ارزیابی؛ نه فقط تماشای ویدیو." },
  { icon: Leaf, title: "احترام به طبیعت", text: "ترویج رنگ طبیعی و مواد پایدار در همه دوره‌ها." },
  { icon: Medal, title: "کیفیت بی‌مصالحه", text: "اثر ضعیف را تأیید نمی‌کنیم؛ حتی اگر یعنی یک ماه تمرین بیشتر." },
];

export default function AboutPage() {
  const intro = getSettings().site.aboutIntro;
  return (
    <>
      <PageHero
        title="داستان ما؛ سه نسل پای دار قالی"
        description="اسدزاده یک کسب‌وکار آموزشی نیست؛ یک خانواده بافنده است که حالا تجربه‌اش را تدریس می‌کند."
        crumbs={[{ href: "/", label: "خانه" }, { label: "درباره ما" }]}
      />

      <div className="shell grid items-center gap-10 py-12 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-black text-navy-900">از تبریز تا ارومیه؛ از دار تا دوربین</h2>
          <div className="mt-4 space-y-4 leading-9 text-ink-700">
            {intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-card p-4 text-center shadow-card ring-1 ring-ink-900/5">
                <dd className="text-xl font-black text-navy-800">{s.value}</dd>
                <dt className="mt-1 text-xs text-ink-500">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className="grid gap-4">
          <div className="overflow-hidden rounded-2xl shadow-card">
            <Image src="/images/workshop-loom.jpg" alt="کارگاه بافت اسدزاده" width={800} height={520} className="aspect-[16/10] w-full object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="overflow-hidden rounded-2xl shadow-card">
              <Image src="/images/workshop-threads.jpg" alt="نخ‌های دست‌رنگ" width={400} height={300} className="aspect-[4/3] w-full object-cover" />
            </div>
            <div className="overflow-hidden rounded-2xl shadow-card">
              <Image src="/images/hero-weaver.jpg" alt="دست‌های استاد در حال بافت" width={400} height={300} className="aspect-[4/3] w-full object-cover" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-sand-50">
        <div className="shell grid gap-10 py-12 lg:grid-cols-2">
          <div>
             <h2 className="text-2xl font-black text-navy-900">خط زمانی ما</h2>
            <ol className="mt-6 space-y-0">
              {timeline.map((t, i) => (
                <li key={t.year} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < timeline.length - 1 && (
                    <span className="absolute top-9 right-[19px] h-[calc(100%-2rem)] w-0.5 bg-ochre-600/30" aria-hidden />
                  )}
                  <span className="z-10 flex h-10 shrink-0 items-center rounded-full bg-navy-800 px-4 text-sm font-black text-white">
                    {t.year}
                  </span>
                  <p className="pt-2 leading-8 text-ink-700">{t.text}</p>
                </li>
              ))}
            </ol>
          </div>
          <div>
             <h2 className="text-2xl font-black text-navy-900">ارزش‌های ما</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {values.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-madder-700/10 text-madder-700">
                    <Icon className="h-5 w-5" />
                  </span>
                   <h3 className="mt-3 font-extrabold text-navy-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-7 text-ink-600">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/courses">مشاهده دوره‌ها</Button>
              <Button href="/instructors" variant="outline">آشنایی با اساتید</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
