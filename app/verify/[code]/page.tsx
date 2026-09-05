import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, BadgeX } from "lucide-react";
import { getCertificate } from "@/lib/store";
import { Certificate } from "@/components/certificate/Certificate";
import { PrintButton } from "@/components/certificate/PrintButton";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: "استعلام گواهی" };

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cert = getCertificate(decodeURIComponent(code));

  return (
    <>
      <div className="print:hidden">
        <PageHero
          title="استعلام اصالت گواهی"
          crumbs={[{ href: "/", label: "خانه" }, { label: "استعلام گواهی" }]}
        />
      </div>
      <div className="shell space-y-6 py-10">
        {cert ? (
          <>
            <p className="mx-auto flex max-w-2xl items-center justify-center gap-2 rounded-2xl bg-teal-50 px-6 py-4 font-extrabold text-teal-800 ring-1 ring-teal-600/25 ring-inset print:hidden">
              <BadgeCheck className="h-6 w-6 shrink-0" />
              این گواهی معتبر است و در سوابق آموزشگاه ثبت شده.
            </p>
            <Certificate cert={cert} />
            <div className="text-center print:hidden">
              <PrintButton label="چاپ / ذخیره PDF" />
            </div>
          </>
        ) : (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-3xl bg-card px-8 py-14 text-center shadow-card ring-1 ring-ink-900/5">
            <BadgeX className="h-12 w-12 text-madder-700" />
            <h2 className="text-xl font-black text-navy-900">گواهی با این کد پیدا نشد</h2>
            <p className="text-sm leading-7 text-ink-600">
              کد واردشده (<span dir="ltr" className="font-bold">{decodeURIComponent(code)}</span>) در سوابق ما ثبت نشده است.
              لطفاً کد را دوباره بررسی کنید یا با پشتیبانی تماس بگیرید.
            </p>
            <Link href="/" className="mt-2 inline-flex h-11 items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
              بازگشت به خانه
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
