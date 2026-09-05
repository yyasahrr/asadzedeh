import Image from "next/image";
import { SectionHeading } from "../ui/SectionHeading";
import { Button } from "../ui/Button";

export function WorkshopGallery() {
  return (
    <section className="section-pad shell" aria-labelledby="workshop">
      <SectionHeading
        eyebrow="کارگاه اسدزاده"
        title="جایی که بوی پشم و رنگ می‌دهد"
        description="کارگاه ما در قلب ارومیه؛ با دارهای چوبی قدیمی، پاتیل‌های رنگرزی و قفسه‌هایی پر از نخ‌های دست‌رنگ."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <figure className="relative overflow-hidden rounded-2xl shadow-card md:col-span-2 md:row-span-2">
          <Image
            src="/images/workshop-loom.jpg"
            alt="دار قالی چوبی در کارگاه اسدزاده"
            width={1000}
            height={800}
            className="h-full min-h-72 w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
          />
          <figcaption className="absolute right-4 bottom-4 rounded-full bg-navy-950/70 px-4 py-1.5 text-xs font-bold text-white backdrop-blur">
            سالن بافت — ۱۲ دار فعال
          </figcaption>
        </figure>
        <figure className="relative overflow-hidden rounded-2xl shadow-card">
          <Image
            src="/images/workshop-threads.jpg"
            alt="کلاف‌های نخ دست‌رنگ در کارگاه"
            width={600}
            height={420}
            className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
          />
          <figcaption className="absolute right-4 bottom-4 rounded-full bg-navy-950/70 px-4 py-1.5 text-xs font-bold text-white backdrop-blur">
            انبار نخ‌های دست‌رنگ
          </figcaption>
        </figure>
        <figure className="relative overflow-hidden rounded-2xl shadow-card">
          <Image
            src="/images/course-dye.jpg"
            alt="پاتیل رنگرزی سنتی با رنگ روناس"
            width={600}
            height={420}
            className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
          />
          <figcaption className="absolute right-4 bottom-4 rounded-full bg-navy-950/70 px-4 py-1.5 text-xs font-bold text-white backdrop-blur">
            بخش رنگرزی طبیعی
          </figcaption>
        </figure>
      </div>
      <div className="mt-6 text-center">
        <Button href="/about" variant="outline">
          داستان کارگاه ما
        </Button>
      </div>
    </section>
  );
}
