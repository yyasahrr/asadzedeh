import type { Metadata } from "next";
import Link from "next/link";
import { Headphones, MessageSquarePlus } from "lucide-react";
import { getSettings, getTickets } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { NewTicketForm } from "@/components/support/NewTicketForm";
import { NewTicketButton } from "@/components/support/NewTicketButton";
import { channelHref } from "@/components/support/SupportWidget";

export const metadata: Metadata = { title: "پشتیبانی" };
export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  "باز": "bg-teal-100 text-teal-800",
  "در حال بررسی": "bg-ochre-100 text-ochre-800",
  "پاسخ داده شده": "bg-navy-50 text-navy-800",
  "بسته شده": "bg-ink-100 text-ink-500",
};

export default async function SupportPage() {
  const user = await getSessionUser();
  const tickets = user ? getTickets().filter((t) => t.userId === user.id) : [];
  const support = getSettings().support;
  const quickChannels = (support?.enabled ? support.channels : []).filter((c) => c.enabled && c.value.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">پشتیبانی</h1>
        {user && <NewTicketButton />}
      </div>

      {!user && (
        <div className="rounded-2xl bg-card p-10 text-center shadow-card">
          <Headphones className="mx-auto h-10 w-10 text-ink-300" />
          <p className="mt-3 font-extrabold text-navy-900">برای ارسال تیکت وارد حساب شوید.</p>
          <Link href="/auth?next=/support" className="mt-3 inline-block text-sm font-bold text-teal-600 hover:underline">ورود / ثبت‌نام ←</Link>
        </div>
      )}

      {/* Quick channels — the floating support button carries the same links. */}
      {user && (
        <div className="rounded-2xl bg-gradient-to-l from-teal-600 to-navy-800 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-black">پشتیبانی سریع</h2>
              <p className="text-sm text-white/70">برای پاسخ فوری، از پیام‌رسان‌ها استفاده کنید</p>
            </div>
          </div>
          {quickChannels.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {quickChannels.map((channel) => (
                <a
                  key={channel.id}
                  href={channelHref(channel)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-navy-900 transition-colors hover:bg-sand-100"
                >
                  <MessageSquarePlus className="h-4 w-4" /> {channel.label}
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/70">
              برای پیگیری دقیق‌تر، تیکت ثبت کنید تا کارشناسان پاسخ دهند.
            </p>
          )}
        </div>
      )}

      {/* Ticket list */}
      {user && tickets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-black text-navy-900">تیکت‌های من</h2>
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/support/${t.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5 transition-colors hover:bg-sand-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-extrabold text-navy-900">{t.subject}</h3>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", statusColors[t.status] ?? "bg-ink-100 text-ink-500")}>
                    {t.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {t.category} • {t.messages.length} پیام • بروزرسانی: {new Date(t.updatedAt).toLocaleDateString("fa-IR")}
                </p>
              </div>
              <span className="text-xs text-ink-400" dir="ltr">{t.id}</span>
            </Link>
          ))}
        </div>
      )}

      {user && tickets.length === 0 && (
        <div className="rounded-2xl bg-card p-8 text-center shadow-card">
          <p className="font-extrabold text-navy-900">هنوز تیکتی ثبت نکرده‌اید.</p>
          <p className="mt-1 text-sm text-ink-600">برای ارسال تیکت جدید روی دکمه بالا کلیک کنید.</p>
        </div>
      )}

      <dialog id="new-ticket-dialog" className="m-auto w-full max-w-lg rounded-3xl bg-card p-0 shadow-lift backdrop:bg-black/40">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-navy-900">تیکت جدید</h2>
            <form method="dialog">
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-sand-100">✕</button>
            </form>
          </div>
          <NewTicketForm />
        </div>
      </dialog>
    </div>
  );
}
