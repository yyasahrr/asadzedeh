import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCertificate } from "@/lib/store";
import { Certificate } from "@/components/certificate/Certificate";
import { PrintButton } from "@/components/certificate/PrintButton";

export const metadata: Metadata = { title: "گواهی پایان دوره" };

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cert = getCertificate(decodeURIComponent(code));
  if (!cert) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/certificates" className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700">
          <ArrowRight className="h-4 w-4" />
          بازگشت به گواهی‌ها
        </Link>
        <PrintButton />
      </div>

      <Certificate cert={cert} />

      <p className="mx-auto max-w-xl rounded-2xl bg-teal-50 p-4 text-center text-sm leading-7 text-teal-800 ring-1 ring-teal-600/20 ring-inset print:hidden">
        برای ذخیره به‌صورت PDF، روی «دانلود PDF / چاپ» بزنید و در پنجره چاپ، گزینه
        «Save as PDF» را انتخاب کنید. اندازه پیشنهادی: A4 افقی (Landscape).
      </p>
    </div>
  );
}
