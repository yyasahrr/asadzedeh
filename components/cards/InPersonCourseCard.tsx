import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock3, MapPin, UsersRound } from "lucide-react";
import type { InPersonClass } from "@/lib/types";
import { formatPriceCompact, toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Visually distinct from online cards: schedule-first layout with capacity meter. */
export function InPersonCourseCard({ cls, className }: { cls: InPersonClass; className?: string }) {
  const taken = cls.capacity - cls.remaining;
  const pct = Math.round((taken / cls.capacity) * 100);
  const urgent = cls.remaining <= 3;

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift",
        className
      )}
    >
      <div className="relative h-44 overflow-hidden">
        <Image
          src={cls.image}
          alt={cls.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent" />
        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-navy-900">
          <CalendarDays className="h-3.5 w-3.5 text-madder-700" />
          شروع: {cls.startDate}
        </span>
        <span className="absolute bottom-3 right-3 rounded-full bg-teal-600 px-3 py-1 text-xs font-bold text-white">
          حضوری • {cls.location}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="text-[17px] leading-8 font-extrabold text-navy-900">{cls.title}</h3>
          <p className="mt-1 text-sm text-ink-600">{cls.instructor}</p>
        </div>

        <dl className="grid grid-cols-2 gap-2.5 text-[13px]">
          <div className="flex items-center gap-2 rounded-lg bg-sand-100 px-3 py-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-teal-600" />
            <span className="font-semibold text-ink-700">{cls.days}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-sand-100 px-3 py-2">
            <Clock3 className="h-4 w-4 shrink-0 text-teal-600" />
            <span className="font-semibold text-ink-700">{cls.time}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-sand-100 px-3 py-2">
            <UsersRound className="h-4 w-4 shrink-0 text-teal-600" />
            <span className="font-semibold text-ink-700">{toFa(cls.sessions)} جلسه</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-sand-100 px-3 py-2">
            <MapPin className="h-4 w-4 shrink-0 text-teal-600" />
            <span className="truncate font-semibold text-ink-700">تهران</span>
          </div>
        </dl>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
            <span className={urgent ? "text-madder-700" : "text-ink-600"}>
              {urgent ? `تنها ${toFa(cls.remaining)} ظرفیت باقی مانده!` : `${toFa(cls.remaining)} ظرفیت باقی مانده`}
            </span>
            <span className="text-ink-400">ظرفیت {toFa(cls.capacity)} نفر</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-900/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={cn("h-full rounded-full", urgent ? "bg-madder-700" : "bg-teal-600")} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-ink-900/10 pt-4">
          <span className="text-lg font-black text-navy-900">{formatPriceCompact(cls.price)}</span>
          <Link
            href={`/classes/${cls.slug}`}
            className="inline-flex h-10 items-center rounded-xl bg-madder-700 px-5 text-sm font-bold text-white transition-colors hover:bg-madder-600"
          >
            ثبت‌نام در کلاس
          </Link>
        </div>
      </div>
    </article>
  );
}
