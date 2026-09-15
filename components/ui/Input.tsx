import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-ink-900/10 bg-card/80 px-4 text-[15px] text-ink-900 shadow-[inset_0_1px_0_rgb(255_255_255/0.8)] placeholder:text-ink-400 transition-all focus:border-teal-600 focus:bg-card focus:outline-none focus:ring-3 focus:ring-teal-600/10";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-28 py-3", className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(base, "h-11 cursor-pointer", className)} {...rest}>
      {children}
    </select>
  );
}

export function FieldLabel({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold text-ink-700">
      {children}
    </label>
  );
}
