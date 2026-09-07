import type { Metadata } from "next";
import Link from "next/link";
import { Check, Reply } from "lucide-react";
import { getComments, getCourse, getClass } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { approveComment, deleteComment, replyComment } from "../actions";

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

      {c.reply && (
        <div className="mt-3 rounded-xl bg-teal-50 px-4 py-3 ring-1 ring-teal-600/15">
          <p className="flex items-center gap-1.5 text-xs font-bold text-teal-700">
            <Reply className="h-3.5 w-3.5" /> پاسخ شما
            {c.replyDate && <span className="font-normal text-ink-400">{c.replyDate}</span>}
          </p>
          <p className="mt-1 text-sm text-ink-700">{c.reply}</p>
        </div>
      )}

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
        {!c.reply && (
          <details className="group">
            <summary className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-navy-50 px-4 text-[13px] font-bold text-navy-800 transition-colors hover:bg-navy-100">
              <Reply className="h-4 w-4" /> پاسخ
            </summary>
            <form action={replyComment} className="mt-2 flex gap-2">
              <input type="hidden" name="id" value={c.id} />
              <label htmlFor={`reply-${c.id}`} className="sr-only">پاسخ</label>
              <input
                id={`reply-${c.id}`}
                name="reply"
                required
                maxLength={1000}
                placeholder="پاسخ خود را بنویسید..."
                className="h-9 flex-1 rounded-lg border border-ink-900/10 bg-white px-3 text-[13px] focus:border-teal-600 focus:outline-none"
              />
              <button type="submit" className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-teal-600 px-3 text-[13px] font-bold text-white transition-colors hover:bg-teal-700">
                ثبت
              </button>
            </form>
          </details>
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
