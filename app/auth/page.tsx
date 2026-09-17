import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/PageHero";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { Logo } from "@/components/Logo";
import { isProduction } from "@/lib/env";
import { safeNextPath } from "@/lib/auth-navigation";
import { cookies } from "next/headers";
import { maskIranianPhone, OTP_CHALLENGE_COOKIE, readOtpChallenge } from "@/lib/otp-challenge";

export const metadata: Metadata = { title: "ورود | ثبت‌نام" };

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string; next?: string; sent?: string; reset?: string; resent?: string }>;
}) {
  const { tab, error, next, sent, reset, resent } = await searchParams;
  // Never echo an attacker-supplied redirect target into the form. The action
  // validates `next` again before redirecting (`safeNextPath`), but the value
  // should not reach the HTML in the first place.
  const safeNext = next ? safeNextPath(next, "") : undefined;
  const challenge = readOtpChallenge((await cookies()).get(OTP_CHALLENGE_COOKIE)?.value);
  return (
    <>
      <PageHero
        title="ورود به اسدزاده"
        crumbs={[{ href: "/", label: "خانه" }, { label: "ورود | ثبت‌نام" }]}
      />
      <div className="shell py-10 lg:py-14">
        <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl bg-card shadow-lift ring-1 ring-ink-900/5 md:grid-cols-2">
          <div className="relative hidden md:block">
            <Image src="/images/hero-weaver.jpg" alt="کارگاه بافت اسدزاده" fill sizes="400px" loading="eager" className="object-cover" />
            <div className="absolute inset-0 bg-navy-950/55" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="text-lg leading-9 font-extrabold text-white">«هر استادکار، روزی اولین گره را زده است.»</p>
              <p className="mt-1 text-sm text-white/70">همین امروز شروع کنید.</p>
            </div>
          </div>
          <div className="p-6 sm:p-10">
            <Logo className="mb-6" />
            <AuthTabs
              initialTab={
                tab === "register" ? "register" : tab === "reset" ? "reset" : tab === "otp" ? "otp" : "login"
              }
              error={error}
              notice={sent ? "sent" : reset ? "reset" : undefined}
              next={safeNext}
              showDemoAccounts={!isProduction()}
              otpChallenge={challenge ? { maskedPhone: maskIranianPhone(challenge.phone), expiresAt: challenge.otpExpiresAt, resendAvailableAt: challenge.resendAvailableAt } : undefined}
              resent={resent === "1"}
            />
          </div>
        </div>
      </div>
    </>
  );
}
