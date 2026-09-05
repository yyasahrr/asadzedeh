import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { InPersonCourseCard } from "@/components/cards/InPersonCourseCard";
import { inPersonClasses } from "@/lib/data";

export const metadata: Metadata = {
  title: "دوره‌های حضوری",
  description: "کلاس‌های حضوری فرش‌بافی، گلیم‌بافی و رنگرزی در کارگاه اسدزاده تهران با ظرفیت محدود.",
};

export default function ClassesPage() {
  return (
    <>
      <PageHero
        title="دوره‌های حضوری در کارگاه"
        description="بافت شانه‌به‌شانه استاد، با دار اختصاصی و مواد اولیه؛ ظرفیت هر کلاس محدود است تا به همه برسیم."
        crumbs={[{ href: "/", label: "خانه" }, { label: "دوره‌های حضوری" }]}
      />
      <div className="shell py-10 lg:py-12">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold text-navy-800 shadow-card ring-1 ring-ink-900/5">
          <MapPin className="h-4 w-4 text-madder-700" />
          همه کلاس‌ها: کارگاه اسدزاده، تهران
        </p>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {inPersonClasses.map((c) => (
            <InPersonCourseCard key={c.slug} cls={c} />
          ))}
        </div>
      </div>
    </>
  );
}
