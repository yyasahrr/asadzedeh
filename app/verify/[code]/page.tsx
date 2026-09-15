import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { BadgeCheck, BadgeX, Timer } from "lucide-react";
import { getCertificate } from "@/lib/store";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { Certificate } from "@/components/certificate/Certificate";
import { PrintButton } from "@/components/certificate/PrintButton";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: "استعلام گواهی" };
// The lookup must happen per request, otherwise the throttle below is cached away.
export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const requestedCode = decodeURIComponent(code);

  // Certificate codes are public, so the page is a natural enumeration target.
  // Throttle lookups per client instead of confirming codes at unlimited speed.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const throttle = rateLimit(`cert-verify:${ip}`, LIMITS.certVerify.limit, LIMITS.certVerify.windowMs);
  const cert = throttle.ok ? getCertificate(requestedCode) : undefined;

  if (!throttle.ok) {
    return (
      <>
        <div className="print:hidden">
          <PageHero
            title="استعلام اصالت گواهی"
            crumbs={[{ href: "/", label: "خانه" }, { label: "استعلام گواهی" }]}
          />
        </div>
        <div className="shell py-10">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-3xl bg-card px-8 py-14 text-center shadow-card ring-1 ring-ink-900/5">
            <Timer className="h-12 w-12 text-ochre-600" />
            <h2 className="text-xl font-black text-navy-900">تعداد استعلام‌ها بیش از حد مجاز است</h2>
            <p className="text-sm leading-7 text-ink-600">
              برای محافظت از اطلاعات هنرجویان، تعداد استعلام‌های پشت‌سرهم محدود است.
              لطفاً حدود {throttle.retryAfterSec} ثانیه دیگر دوباره تلاش کنید.
            </p>
            <Link href="/" className="mt-2 inline-flex h-11 items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
              بازگشت به خانه
            </Link>
          </div>
        </div>
      </>
    );
  }

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
              کد واردشده (<span dir="ltr" className="font-bold">{requestedCode}</span>) در سوابق ما ثبت نشده است.
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
