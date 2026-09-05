import Link from "next/link";
import { ArrowLeft, Droplets, Grid2x2, Layers, PenTool, Wrench, type LucideIcon } from "lucide-react";
import type { LearningPath } from "@/lib/types";
import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

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

export function LearningPathCard({ path }: { path: LearningPath }) {
  const Icon = icons[path.slug] ?? Layers;
  return (
    <Link
      href="/paths"
      className="group flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white", accents[path.accent])}>
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-lg font-extrabold text-navy-900">{path.title}</h3>
      <p className="text-sm leading-7 text-ink-600">{path.description}</p>
      <div className="mt-auto flex items-center justify-between border-t border-dashed border-ink-900/10 pt-4 text-[13px] font-semibold text-ink-600">
        <span>
          {toFa(path.steps)} مرحله • {path.duration}
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-teal-600 transition-transform group-hover:-translate-x-1">
          شروع مسیر
          <ArrowLeft className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
