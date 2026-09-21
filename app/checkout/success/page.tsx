import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getOrder } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { ClearCart } from "@/components/checkout/ClearCart";

export const metadata: Metadata = { title: "پرداخت موفق" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; account?: string }>;
}) {
  const { order: orderId, account } = await searchParams;
  const order = orderId ? getOrder(orderId) : undefined;
  const hasCourse = order?.lines?.some((l) => l.kind === "course") ?? true;
  const hasPhysical = order?.lines?.some((l) => l.kind === "product") ?? false;

  return (
    <div className="shell py-14">
      <ClearCart />
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-3xl bg-card px-8 py-12 text-center shadow-card ring-1 ring-ink-900/5">
        <CheckCircle2 className="h-14 w-14 text-teal-600" />
        <h1 className="text-2xl font-black text-navy-900">پرداخت با موفقیت انجام شد 🎉</h1>
        {order && (
          <dl className="mt-2 w-full space-y-2 rounded-2xl bg-sand-50 p-4 text-sm ring-1 ring-ink-900/5">
            <div className="flex justify-between"><dt className="text-ink-500">شماره سفارش</dt><dd className="font-bold" dir="ltr">{order.id}</dd></div>
            <div className="flex justify-between gap-4"><dt className="shrink-0 text-ink-500">شرح</dt><dd className="font-semibold">{order.item}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">مبلغ</dt><dd className="font-bold">{formatPrice(order.amount)}</dd></div>
            {order.refId && (
              <div className="flex justify-between"><dt className="text-ink-500">کد پیگیری</dt><dd className="font-bold" dir="ltr">{order.refId}</dd></div>
            )}
          </dl>
        )}
        <p className="text-sm leading-7 text-ink-600">
          {hasCourse && "دسترسی به دوره‌ها در پنل هنرجو فعال شد. "}
          {hasPhysical && `کالاها با ${order?.shipping?.method ?? "روش انتخابی"} ارسال می‌شود؛ کد رهگیری در بخش سفارش‌ها ثبت خواهد شد. `}
          پیامک تأیید هم برایتان ارسال می‌شود.
        </p>
        {account === "new" && (
          <p className="rounded-xl bg-ochre-50 px-4 py-3 text-sm leading-7 text-ochre-800 ring-1 ring-ochre-700/15">
            برای شما یک حساب هنرجویی با همین شماره موبایل ساخته شد؛ رمز ورود پیامک شده است. پس از ورود می‌توانید رمز را در پروفایل تغییر دهید.
          </p>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href={account === "new" ? "/auth?next=/dashboard/courses" : "/dashboard"} className="inline-flex h-11 items-center rounded-xl bg-navy-800 px-8 font-bold text-white">
            ورود به پنل هنرجو
          </Link>
          <Link href="/courses" className="inline-flex h-11 items-center rounded-xl bg-sand-200 px-6 text-sm font-bold text-ink-800">
            مشاهده دوره‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}
