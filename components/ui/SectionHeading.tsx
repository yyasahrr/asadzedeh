import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  link?: { href: string; label: string };
  dark?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  link,
  dark = false,
  className,
}: Props) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-3 lg:mb-12",
        centered ? "items-center text-center" : "items-start text-start",
        className
      )}
    >
      {eyebrow && (
        <span
          className={cn(
            "inline-flex items-center gap-2 text-sm font-bold tracking-wide",
            dark ? "text-ochre-200" : "text-madder-700"
          )}
        >
          <span className={cn("h-px w-8", dark ? "bg-ochre-200" : "bg-madder-700")} aria-hidden />
          {eyebrow}
          {centered && (
            <span className={cn("h-px w-8", dark ? "bg-ochre-200" : "bg-madder-700")} aria-hidden />
          )}
        </span>
      )}
      <h2
        className={cn(
          "max-w-2xl text-2xl font-black leading-snug text-balance sm:text-3xl lg:text-[34px] lg:leading-[1.6]",
          dark ? "text-white" : "text-navy-900"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "max-w-2xl text-[15px] leading-8",
            dark ? "text-white/70" : "text-ink-600"
          )}
        >
          {description}
        </p>
      )}
      {link && (
        <Link
          href={link.href}
          className={cn(
            "mt-1 inline-flex items-center gap-1.5 text-sm font-bold transition-colors",
            dark ? "text-ochre-200 hover:text-white" : "text-teal-600 hover:text-teal-700"
          )}
        >
          {link.label}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
