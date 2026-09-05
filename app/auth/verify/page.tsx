import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { FieldLabel, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { verifyMfa, verifyMfaForSession } from "../actions";

export const metadata: Metadata = { title: "تأیید دومرحله‌ای" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const { error, mode } = await searchParams;
  const action = mode === "session" ? verifyMfaForSession : verifyMfa;
  return (
    <>
      <PageHero title="تأیید هویت دومرحله‌ای" crumbs={[{ href: "/", label: "خانه" }, { href: "/auth", label: "ورود" }, { label: "کد تأیید" }]} />
      <div className="shell py-10 lg:py-14">
        <div className="mx-auto max-w-md rounded-3xl bg-card p-8 shadow-lift ring-1 ring-ink-900/5">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-black text-navy-900">کد Google Authenticator</h2>
              <p className="text-xs text-ink-500">کد ۶ رقمی برنامه احراز هویت یا یکی از کدهای بازیابی را وارد کنید.</p>
            </div>
          </div>
          {error === "code" && (
            <p className="mb-4 flex items-center gap-2 rounded-xl bg-madder-50 px-4 py-3 text-sm font-bold text-madder-700 ring-1 ring-madder-700/20 ring-inset">
              <AlertCircle className="h-5 w-5 shrink-0" />
              کد اشتباه یا منقضی است. دوباره تلاش کنید.
            </p>
          )}
          <form action={action} className="space-y-4">
            <div>
              <FieldLabel htmlFor="mfa-code">کد تأیید</FieldLabel>
              <Input
                id="mfa-code"
                name="code"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                dir="ltr"
                className="text-center text-2xl font-black tracking-[0.4em]"
              />
            </div>
            <Button type="submit" size="lg" className="w-full">تأیید و ورود</Button>
          </form>
          <p className="mt-4 text-center text-xs leading-6 text-ink-500">
            به برنامه دسترسی ندارید؟ از کد بازیابی (مثل <span dir="ltr" className="font-bold">AB12-CD34</span>) استفاده کنید یا با مدیر کل تماس بگیرید.
          </p>
          <p className="mt-2 text-center text-xs">
            <Link href="/auth" className="font-bold text-teal-700 hover:underline">بازگشت به ورود</Link>
          </p>
        </div>
      </div>
    </>
  );
}
