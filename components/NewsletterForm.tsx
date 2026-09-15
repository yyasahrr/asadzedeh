"use client";

import { useActionState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { subscribeNewsletter } from "@/app/actions";

export function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);

  if (state?.ok) {
    return (
      <p className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${dark ? "bg-teal-600/20 text-teal-100" : "bg-teal-50 text-teal-700 ring-1 ring-teal-600/20 ring-inset"}`}>
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">ایمیل</label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        placeholder="ایمیل شما"
        className={
          dark
            ? "h-11 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 text-[15px] text-white placeholder:text-white/50 focus:border-ochre-200 focus:outline-none"
            : "h-11 flex-1 rounded-xl border border-ink-900/10 bg-white px-4 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-teal-600 focus:outline-none"
        }
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-madder-700 px-6 text-[15px] font-bold text-white transition-colors hover:bg-madder-600 disabled:opacity-60"
      >
        <Send className="h-4 w-4 -scale-x-100" />
        {pending ? "…" : "عضویت"}
      </button>
      {state && !state.ok && <p className="text-xs font-bold text-madder-700">{state.message}</p>}
    </form>
  );
}
