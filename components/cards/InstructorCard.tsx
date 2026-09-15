import Image from "next/image";
import Link from "next/link";
import { Award, BookOpenCheck, UsersRound } from "lucide-react";
import type { Instructor } from "@/lib/types";
import { toFa } from "@/lib/format";

export function InstructorCard({ instructor }: { instructor: Instructor }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-ink-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={instructor.image}
          alt={instructor.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-extrabold text-navy-900">{instructor.name}</h3>
        <p className="text-sm font-semibold text-madder-700">{instructor.specialty}</p>
        <p className="line-clamp-2 text-sm leading-7 text-ink-600">{instructor.bio}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-600">
          <span className="inline-flex items-center gap-1.5">
            <Award className="h-4 w-4 text-ochre-600" />
            {instructor.experience} تجربه
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UsersRound className="h-4 w-4 text-ochre-600" />
            {toFa(instructor.students)} هنرجو
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpenCheck className="h-4 w-4 text-ochre-600" />
            {toFa(instructor.courses)} دوره
          </span>
        </div>
        <Link
          href="/instructors"
          className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-navy-800/20 text-sm font-bold text-navy-800 transition-colors hover:border-navy-800 hover:bg-navy-50"
        >
          مشاهده پروفایل استاد
        </Link>
      </div>
    </article>
  );
}
