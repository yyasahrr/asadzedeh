import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { getComments, getCourse, getClass } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { approveComment, deleteComment } from "../actions";

export const metadata: Metadata = { title: "نظرات" };

export default async function AdminCommentsPage() {
  const user = await getSessionUser();
  if (!can(user, "comments")) return <Denied />;
  const comments = getComments();
  const pending = comments.filter((c) => c.status === "pending");
  const approved = comments.filter((c) => c.status === "approved");

  const target = (c: (typeof comments)[number]) =>
    c.scope === "course" ? getCourse(c.slug)?.shortTitle : getClass(c.slug)?.title;

  const Card = ({ c }: { c: (typeof comments)[number] }) => (
    <article className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-navy-900">
          {c.name} <span className="font-semibold text-ink-400">• {c.date}</span>
        </p>
        <Link
          href={`/${c.scope === "course" ? "courses" : "classes"}/${c.slug}#comments`}
          className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ink-600 hover:bg-sand-200"
        >
          {target(c) ?? c.slug}
        </Link>
      </div>
      <p className="mt-2 text-[15px] leading-8 text-ink-700">{c.text}</p>
      <div className="mt-3 flex items-center gap-2 border-t border-dashed border-ink-900/10 pt-3">
        {c.status === "pending" && (
          <form action={approveComment}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-teal-600 px-4 text-[13px] font-bold text-white transition-colors hover:bg-teal-700">
              <Check className="h-4 w-4" />
              تأیید و انتشار
            </button>
          </form>
        )}
        <DeleteButton action={deleteComment} hidden={{ name: "id", value: c.id }} label="نظر" />
      </div>
    </article>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-navy-900">نظرات و پرسش‌ها</h1>
      <section>
        <h2 className="mb-3 font-extrabold text-navy-900">در انتظار تأیید ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-ink-500 shadow-card">نظری در انتظار نیست. 🎉</p>
        ) : (
          <div className="grid gap-4">{pending.map((c) => (<Card key={c.id} c={c} />))}</div>
        )}
      </section>
      <section>
        <h2 className="mb-3 font-extrabold text-navy-900">منتشرشده ({approved.length})</h2>
        <div className="grid gap-4">{approved.map((c) => (<Card key={c.id} c={c} />))}</div>
      </section>
    </div>
  );
}
