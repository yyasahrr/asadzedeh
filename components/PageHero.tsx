import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Crumb {
  href?: string;
  label: string;
}

export function PageHero({
  title,
  description,
  crumbs,
}: {
  title: string;
  description?: string;
  crumbs: Crumb[];
}) {
  return (
    <div className="bg-lattice border-b border-ink-900/10">
      <div className="shell py-10 lg:py-14">
        <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-1 text-[13px] text-ink-500">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1">
              {i > 0 && <ChevronLeft className="h-3.5 w-3.5 text-ink-300" aria-hidden />}
              {c.href ? (
                <Link href={c.href} className="transition-colors hover:text-navy-800">
                  {c.label}
                </Link>
              ) : (
                <span className="font-bold text-navy-900">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="mt-4 max-w-3xl text-3xl leading-snug font-black text-balance text-navy-950 sm:text-4xl sm:leading-snug">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl leading-8 text-ink-600">{description}</p>
        )}
      </div>
      <div className="pattern-strip-thin" aria-hidden />
    </div>
  );
}
