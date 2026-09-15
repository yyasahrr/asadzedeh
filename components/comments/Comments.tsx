import { CheckCircle2, MessageCircleQuestion, Reply } from "lucide-react";
import { getApprovedComments } from "@/lib/store";
import { submitComment } from "@/app/actions";
import { FieldLabel, Input, Textarea } from "../ui/Input";

export function Comments({
  scope,
  slug,
  sent,
}: {
  scope: "course" | "class";
  slug: string;
  sent: boolean;
}) {
  const comments = getApprovedComments(scope, slug);

  return (
    <section id="comments" aria-labelledby="comments-title" className="scroll-mt-28 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
      <h2 id="comments-title" className="flex items-center gap-2 text-lg font-black text-navy-900">
        <MessageCircleQuestion className="h-5 w-5 text-teal-600" />
        پرسش و نظر هنرجویان
      </h2>

      {sent && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800 ring-1 ring-teal-600/20 ring-inset">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          نظر شما ثبت شد و بعد از تأیید نمایش داده می‌شود.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="mt-4 rounded-xl bg-sand-50 px-4 py-5 text-center text-sm text-ink-500">
          هنوز نظری ثبت نشده؛ اولین نفر باشید.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="space-y-2">
              <div className="rounded-xl bg-sand-50 px-4 py-3.5 ring-1 ring-ink-900/5">
                <p className="text-sm font-extrabold text-navy-900">
                  {c.name} <span className="ms-2 font-semibold text-ink-400">{c.date}</span>
                </p>
                <p className="mt-1.5 text-[15px] leading-8 text-ink-700">{c.text}</p>
              </div>
              {c.reply && (
                <div className="mr-6 rounded-xl bg-teal-50 px-4 py-3 ring-1 ring-teal-600/15">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-teal-700">
                    <Reply className="h-3.5 w-3.5" /> پاسخ مدیریت
                    {c.replyDate && <span className="font-normal text-ink-400">{c.replyDate}</span>}
                  </p>
                  <p className="mt-1.5 text-sm leading-7 text-ink-700">{c.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={submitComment} className="mt-5 grid gap-3 border-t border-dashed border-ink-900/10 pt-5 sm:grid-cols-[200px_1fr]">
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="slug" value={slug} />
        <div>
          <FieldLabel htmlFor={`c-name-${slug}`}>نام شما</FieldLabel>
          <Input id={`c-name-${slug}`} name="name" required maxLength={60} placeholder="نام و نام خانوادگی" />
        </div>
        <div>
          <FieldLabel htmlFor={`c-text-${slug}`}>نظر یا پرسش</FieldLabel>
          <Textarea id={`c-text-${slug}`} name="text" required maxLength={1000} placeholder="سؤالتان را بپرسید…" className="min-h-20" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
            ثبت نظر
          </button>
        </div>
      </form>
    </section>
  );
}
