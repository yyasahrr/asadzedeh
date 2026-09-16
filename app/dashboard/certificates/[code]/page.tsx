import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileDown } from "lucide-react";
import { getCertificate } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";
import { canAccessCertificate } from "@/lib/certificate-access";
import { Certificate } from "@/components/certificate/Certificate";
import { PrintButton } from "@/components/certificate/PrintButton";

export const metadata: Metadata = { title: "گواهی پایان دوره" };
export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const found = getCertificate(decodeURIComponent(code));
  // A certificate is a personal document and its code is not a secret: the same
  // 404 covers "does not exist" and "is not yours". Public authenticity checks
  // live on /verify/[code].
  const cert = canAccessCertificate(found, await getSessionUser()) ? found : undefined;
  if (!cert) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/certificates" className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700">
          <ArrowRight className="h-4 w-4" />
          بازگشت به گواهی‌ها
        </Link>
        <span className="flex flex-wrap gap-2">
          <a
            href={`/api/certificates/${encodeURIComponent(cert.code)}/pdf`}
            download
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-madder-700 px-6 text-[15px] font-bold text-white transition-colors hover:bg-madder-600"
          >
            <FileDown className="h-5 w-5" />
            دانلود PDF
          </a>
          {cert.deliveryType !== "uploaded" ? <PrintButton label="چاپ" /> : null}
        </span>
      </div>

      {cert.deliveryType !== "uploaded" ? <Certificate cert={cert} /> : (
        <div className="rounded-2xl bg-card p-8 text-center shadow-card ring-1 ring-ink-900/5">
          <h1 className="text-xl font-black text-navy-900">{cert.course}</h1>
          <p className="mt-2 text-sm text-ink-600">نسخه نهایی مدرک به‌صورت PDF اختصاصی صادر شده است.</p>
        </div>
      )}

      <p className="mx-auto max-w-xl rounded-2xl bg-teal-50 p-4 text-center text-sm leading-7 text-teal-800 ring-1 ring-teal-600/20 ring-inset print:hidden">
        {cert.deliveryType === "uploaded" ? "فایل PDF فقط برای صاحب مدرک و کارکنان مجاز قابل دریافت است." : "برای ذخیره به‌صورت PDF، روی «دانلود PDF / چاپ» بزنید. اندازه پیشنهادی: A4 افقی (Landscape)."}
      </p>
    </div>
  );
}
