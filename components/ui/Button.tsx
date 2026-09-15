import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "highlight" | "outline" | "ghost" | "sand";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-navy-800 text-white hover:-translate-y-0.5 hover:bg-navy-700 shadow-card",
  accent: "bg-teal-600 text-white hover:bg-teal-700 shadow-card",
  highlight: "bg-madder-700 text-white hover:bg-madder-600 shadow-card",
  outline:
    "border border-navy-800/20 bg-card/50 text-navy-800 backdrop-blur-sm hover:border-navy-800/45 hover:bg-card",
  ghost: "text-navy-800 hover:bg-navy-50",
  sand: "bg-sand-200 text-ink-900 hover:bg-sand-300",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[15px]",
  lg: "h-[52px] px-8 text-base",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  href,
  children,
  className,
  ...rest
}: Props) {
  const cls = cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-600/40",
    "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
