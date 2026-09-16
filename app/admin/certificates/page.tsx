import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileUp } from "lucide-react";
import { getCertificateRequests } from "@/lib/certificate-requests";
import { getCertificates } from "@/lib/store";
import { toFa } from "@/lib/format";
import { Input } from "@/components/ui/Input";
import {
  issueRequestedCertificate,
  reviewCertificateRequest,
  revokeCertificate,
  updateCertificateDetails,
  uploadRequestedCertificatePdf,
} from "../actions";

export const metadata: Metadata = { title: "گواهی‌ها" };
export const dynamic = "force-dynamic";

const labels = { pending: "در انتظار بررسی", approved: "تأیید شده", issued: "صادر شده", rejected: "رد شده" } as const;

export default async function AdminCertificatesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const requests = await getCertificateRequests();
  const certs = getCertificates();
  const { error } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-900">گواهی‌های پایان دوره</h1>
        <p className="mt-1 text-sm text-ink-500">درخواست‌ها را بررسی و مدرک سیستمی یا PDF اختصاصی صادر کنید.</p>
      </div>
      {error ? <p className="rounded-xl bg-madder-50 p-3 text-sm font-bold text-madder-700">{error === "storage" ? "فضای ذخیره‌سازی پایدار برای PDF پیکربندی نشده است." : "فایل باید PDF معتبر و حداکثر ۱۰ مگابایت باشد."}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-black text-navy-900">صف درخواست‌ها</h2>
        {requests.map((request) => (
          <article key={request.id} className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-extrabold text-navy-900">{request.studentName} — {request.courseTitle}</h3>
                  <span className="rounded-md bg-sand-100 px-2 py-1 text-xs font-bold text-ink-600">{labels[request.status]}</span>
                </div>
                <dl className="mt-2 grid gap-x-5 gap-y-1 text-xs text-ink-500 sm:grid-cols-2 xl:grid-cols-4">
                  <div><dt className="inline font-bold">شناسه: </dt><dd className="inline" dir="ltr">{request.id}</dd></div>
                  <div><dt className="inline font-bold">موبایل: </dt><dd className="inline" dir="ltr">{request.studentPhone}</dd></div>
                  <div><dt className="inline font-bold">مدرس: </dt><dd className="inline">{request.instructorName || "—"}</dd></div>
                  <div><dt className="inline font-bold">مدت: </dt><dd className="inline">{toFa(request.hours)} ساعت</dd></div>
                  <div><dt className="inline font-bold">تکمیل: </dt><dd className="inline">{new Date(request.completedAt).toLocaleDateString("fa-IR")}</dd></div>
                  <div><dt className="inline font-bold">درخواست: </dt><dd className="inline">{new Date(request.requestedAt).toLocaleDateString("fa-IR")}</dd></div>
                </dl>
                {request.adminNote ? <p className="mt-2 text-xs text-ink-600">یادداشت: {request.adminNote}</p> : null}
              </div>
              {request.certificateCode ? <Link href={`/verify/${encodeURIComponent(request.certificateCode)}`} className="inline-flex h-10 items-center gap-2 text-sm font-bold text-teal-700"><ExternalLink className="h-4 w-4" /> مشاهده مدرک</Link> : null}
            </div>
            <div className="mt-4 grid gap-3 border-t border-dashed border-ink-900/10 pt-4 lg:grid-cols-3">
              <form action={reviewCertificateRequest} className="flex min-w-0 gap-2">
                <input type="hidden" name="id" value={request.id} />
                <Input name="adminNote" defaultValue={request.adminNote} placeholder="یادداشت یا دلیل رد" className="min-w-0" />
                <button name="decision" value="approved" className="h-10 shrink-0 rounded-lg bg-teal-700 px-3 text-xs font-bold text-white">تأیید</button>
                <button name="decision" value="rejected" className="h-10 shrink-0 rounded-lg bg-madder-700 px-3 text-xs font-bold text-white">رد</button>
              </form>
              <form action={issueRequestedCertificate}>
                <input type="hidden" name="id" value={request.id} />
                <button disabled={request.status === "rejected" || request.status === "issued"} className="h-10 w-full rounded-lg bg-navy-800 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">صدور سیستمی</button>
              </form>
              <form action={uploadRequestedCertificatePdf} className="flex min-w-0 gap-2">
                <input type="hidden" name="id" value={request.id} />
                <input aria-label="فایل PDF مدرک" name="pdf" type="file" required accept="application/pdf,.pdf" className="min-w-0 flex-1 text-xs file:me-2 file:rounded-lg file:border-0 file:bg-sand-100 file:px-3 file:py-2 file:font-bold" />
                <button disabled={request.status === "rejected"} aria-label="آپلود PDF اختصاصی" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ochre-600 text-white disabled:opacity-40"><FileUp className="h-4 w-4" /></button>
              </form>
            </div>
          </article>
        ))}
        {requests.length === 0 ? <p className="rounded-2xl bg-card p-8 text-center text-sm text-ink-500">درخواستی ثبت نشده است.</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-navy-900">مدارک صادرشده</h2>
        {certs.map((cert) => (
          <article key={cert.code} className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-navy-900">{cert.student} — {cert.course}</p>
              <Link href={`/verify/${encodeURIComponent(cert.code)}`} dir="ltr" className="text-sm font-bold text-teal-700">{cert.code}</Link>
            </div>
            <form action={updateCertificateDetails} className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <input type="hidden" name="code" value={cert.code} />
              <Input name="student" defaultValue={cert.student} aria-label="نام نمایشی" />
              <Input name="course" defaultValue={cert.course} aria-label="عنوان دوره" />
              <Input name="instructor" defaultValue={cert.instructorName} aria-label="مدرس" />
              <Input name="hours" defaultValue={cert.hours} inputMode="numeric" aria-label="ساعت" />
              <div className="flex gap-2"><button className="h-10 flex-1 rounded-lg bg-sand-200 text-xs font-bold">ذخیره</button>{!cert.revokedAt ? <button formAction={revokeCertificate} className="h-10 flex-1 rounded-lg bg-madder-50 text-xs font-bold text-madder-700">لغو اعتبار</button> : <span className="self-center text-xs font-bold text-madder-700">لغوشده</span>}</div>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
