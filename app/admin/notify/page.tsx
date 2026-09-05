import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Mail, MessageSquareText, Settings2, XCircle } from "lucide-react";
import { getNotifyLog, getSettings, getStudents, getSubscribers } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Input";
import { sendBroadcast } from "../actions";

export const metadata: Metadata = { title: "پیامک و ایمیل" };

export default async function NotifyPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; detail?: string }>;
}) {
  const user = await getSessionUser();
  if (!can(user, "notify")) return <Denied />;
  const { sent, detail } = await searchParams;
  const settings = getSettings();
  const students = getStudents();
  const subs = getSubscribers();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">پیامک و ایمیل همگانی</h1>
        <Link href="/admin/settings" className="inline-flex h-10 items-center gap-2 rounded-xl bg-card px-4 text-sm font-bold text-navy-800 shadow-card ring-1 ring-ink-900/5">
          <Settings2 className="h-4 w-4" />
          تنظیمات سامانه پیامکی و ایمیل
        </Link>
      </div>

      {sent && (
        <p className={`flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold ring-1 ring-inset ${sent === "1" ? "bg-teal-50 text-teal-800 ring-teal-600/25" : "bg-madder-50 text-madder-700 ring-madder-700/25"}`}>
          {sent === "1" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {detail || (sent === "1" ? "ارسال شد." : "ارسال ناموفق بود.")}
        </p>
      )}

      <p className="rounded-2xl bg-sand-50 px-5 py-3 text-[13px] leading-7 text-ink-600 ring-1 ring-ink-900/5 ring-inset">
        وضعیت فعلی — پیامک: <strong>{settings.sms.provider === "demo" ? "نمایشی" : settings.sms.provider}</strong>
        {" "}• ایمیل: <strong>{settings.email.host ? settings.email.host : "نمایشی"}</strong>
        {" "}• در حالت نمایشی، پیام‌ها واقعاً ارسال نمی‌شوند و فقط در لاگ زیر ثبت می‌شوند.
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <form action={sendBroadcast} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <input type="hidden" name="channel" value="sms" />
          <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
            <MessageSquareText className="h-5 w-5 text-teal-600" />
            ارسال پیامک ({toFa(students.length)} هنرجو)
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <FieldLabel htmlFor="sms-aud">گیرندگان</FieldLabel>
              <Select id="sms-aud" name="audience" defaultValue="all">
                <option value="all">همه هنرجویان</option>
                <option value="pending">فقط در انتظار پرداخت</option>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="sms-msg">متن پیامک *</FieldLabel>
              <Textarea id="sms-msg" name="message" required placeholder="مثلاً: ثبت‌نام ترم پاییز شروع شد…" />
            </div>
            <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-teal-600 px-8 font-bold text-white transition-colors hover:bg-teal-700">
              ارسال پیامک
            </button>
          </div>
        </form>

        <form action={sendBroadcast} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <input type="hidden" name="channel" value="email" />
          <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
            <Mail className="h-5 w-5 text-ochre-600" />
            ارسال ایمیل ({toFa(subs.length)} عضو خبرنامه)
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <FieldLabel htmlFor="em-subject">موضوع</FieldLabel>
              <Input id="em-subject" name="subject" placeholder="خبرنامه اسدزاده" />
            </div>
            <div>
              <FieldLabel htmlFor="em-msg">متن ایمیل *</FieldLabel>
              <Textarea id="em-msg" name="message" required />
            </div>
            <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-ochre-600 px-8 font-bold text-white transition-colors hover:bg-ochre-500">
              ارسال ایمیل
            </button>
          </div>
        </form>
      </div>

      <section>
        <h2 className="mb-3 font-extrabold text-navy-900">لاگ ارسال‌ها</h2>
        <TableShell head={["تاریخ", "کانال", "گیرندگان", "متن", "وضعیت"]}>
          {getNotifyLog().map((l) => (
            <tr key={l.id} className="transition-colors hover:bg-sand-50">
              <Td className="whitespace-nowrap text-ink-600">{l.date}</Td>
              <Td>{l.channel === "sms" ? "پیامک" : "ایمیل"}</Td>
              <Td className="max-w-56 truncate text-ink-600">{l.to}</Td>
              <Td className="max-w-72 truncate text-ink-600">{l.message}</Td>
              <Td className="whitespace-nowrap"><span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold">{l.status}</span></Td>
            </tr>
          ))}
        </TableShell>
        {getNotifyLog().length === 0 && (
          <p className="mt-3 rounded-2xl bg-card p-6 text-center text-sm text-ink-500 shadow-card">هنوز چیزی ارسال نشده است.</p>
        )}
      </section>
    </div>
  );
}
