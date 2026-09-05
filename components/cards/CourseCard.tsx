import Image from "next/image";
import Link from "next/link";
import { Clock3, LayoutGrid, UsersRound } from "lucide-react";
import type { OnlineCourse } from "@/lib/types";
import { formatPrice, formatPriceCompact, toFa } from "@/lib/format";
import { Badge } from "../ui/Badge";
import { Stars } from "../ui/Stars";
import { cn } from "@/lib/utils";

export function CourseCard({ course, className }: { course: OnlineCourse; className?: string }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={course.image}
          alt={course.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {(course.badge || course.students === 0) && (
          <span className="absolute top-3 right-3 rounded-full bg-madder-700 px-3 py-1 text-xs font-bold text-white shadow-card">
            {course.badge ?? "جدید"}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <Badge tone="navy">{course.category}</Badge>
          <Badge tone="sand">{course.level}</Badge>
        </div>

        <h3 className="text-[17px] leading-8 font-extrabold text-navy-900 transition-colors group-hover:text-navy-700">
          {course.title}
        </h3>
        <p className="text-sm text-ink-600">
          {course.instructor} <span className="text-ink-400">• {course.instructorRole}</span>
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-600">
          <span className="inline-flex items-center gap-1.5">
            <LayoutGrid className="h-4 w-4 text-teal-600" />
            {toFa(course.sessions)} جلسه
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-4 w-4 text-teal-600" />
            {toFa(course.hours)} ساعت
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UsersRound className="h-4 w-4 text-teal-600" />
            {toFa(course.students)} هنرجو
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-dashed border-ink-900/10 pt-4">
          <div>
            <Stars value={course.rating} />
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-lg font-black text-navy-900">{formatPriceCompact(course.price)}</span>
              {course.oldPrice && (
                <span className="text-xs text-ink-400 line-through">{formatPrice(course.oldPrice)}</span>
              )}
            </div>
          </div>
          <span className="inline-flex h-10 items-center rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors group-hover:bg-madder-700">
            مشاهده دوره
          </span>
        </div>
      </div>
    </Link>
  );
}
