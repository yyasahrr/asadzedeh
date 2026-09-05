import Image from "next/image";
import type { StudentWork } from "@/lib/types";

export function StudentWorkCard({ work }: { work: StudentWork }) {
  return (
    <figure className="group relative w-64 shrink-0 snap-start overflow-hidden rounded-2xl shadow-card ring-1 ring-ink-900/5 sm:w-72">
      <div className="relative aspect-[4/5]">
        <Image
          src={work.image}
          alt={`${work.title} — اثر ${work.student}`}
          fill
          sizes="300px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/20 to-transparent" />
      <figcaption className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-[11px] font-bold text-ochre-200">{work.course}</p>
        <p className="mt-0.5 font-extrabold text-white">{work.title}</p>
        <p className="mt-0.5 text-xs text-white/70">اثر {work.student}</p>
      </figcaption>
    </figure>
  );
}
