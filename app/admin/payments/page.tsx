import type { Metadata } from "next";
import { BadgeCheck, CheckCircle2, CreditCard } from "lucide-react";
import { getOrders, getSettings } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import { savePaymentSettings } from "../actions";
import { MERCHANT_LABELS, PAYMENT_PROVIDERS, PROVIDER_LABELS } from "@/lib/payment";
import { defaultPaymentGateways } from "@/lib/seed";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "پرداخت" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await getSessionUser();
  if (!can(user, "payments")) return <Denied />;
  const { saved } = await searchParams;
  const payment = getSettings().payment;
  const paid = getOrders().filter((o) => o.status === "پرداخت شده");
  // Show every supported gateway, falling back to the blank default for any the
  // operator has not touched yet.
  const stored = payment.gateways ?? [];
  const gateways = defaultPaymentGateways.map(
    (fallback) => stored.find((g) => g.provider === fallback.provider) ?? fallback,
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">درگاه پرداخت و تراکنش‌ها</h1>
      {saved && (
        <p className="flex items-center gap-2 rounded-2xl bg-teal-50 px-5 py-3.5 text-sm font-bold text-teal-800 ring-1 ring-teal-600/25 ring-inset">
          <CheckCircle2 className="h-5 w-5" />
          تنظیمات درگاه ذخیره شد.
        </p>
      )}

      <form action={savePaymentSettings} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
          <CreditCard className="h-5 w-5 text-teal-600" />
          اتصال به درگاه پرداخت
        </h2>
        <p className="mt-2 text-[13px] leading-7 text-ink-500">
          اطلاعات هر درگاه جداگانه ذخیره می‌شود؛ با تغییر «درگاه فعال»، مرچنت‌کد بقیه درگاه‌ها پاک نمی‌شود.
          در حالت نمایشی، پرداخت در تسویه‌حساب فوراً موفق ثبت می‌شود.
        </p>

        <div className="mt-4 max-w-sm">
          <FieldLabel htmlFor="pg-provider">درگاه فعال</FieldLabel>
          <Select id="pg-provider" name="provider" defaultValue={payment.provider}>
            {PAYMENT_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {PROVIDER_LABELS[provider]}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-5 space-y-3">
          {gateways.map((gateway) => (
            <div
              key={gateway.provider}
              className={cn(
                "rounded-2xl p-4 ring-1 ring-inset",
                gateway.provider === payment.provider ? "bg-teal-50 ring-teal-600/25" : "bg-sand-50 ring-ink-900/5",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-navy-900">{PROVIDER_LABELS[gateway.provider]}</span>
                {gateway.provider === payment.provider && (
                  <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[11px] font-bold text-white">فعال</span>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <FieldLabel htmlFor={`pg-${gateway.provider}-merchantId`}>
                    {MERCHANT_LABELS[gateway.provider]}
                  </FieldLabel>
                  <Input
                    id={`pg-${gateway.provider}-merchantId`}
                    name={`pg-${gateway.provider}-merchantId`}
                    defaultValue={gateway.merchantId}
                    dir="ltr"
                    className="text-left"
                    placeholder="xxxxxxxx-xxxx-..."
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl bg-white px-4 py-3 text-sm font-bold ring-1 ring-ink-900/5 ring-inset">
                  <input
                    type="checkbox"
                    name={`pg-${gateway.provider}-enabled`}
                    defaultChecked={gateway.enabled}
                    className="h-4 w-4 accent-teal-600"
                  />
                  فعال برای استفاده
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl bg-white px-4 py-3 text-sm font-bold ring-1 ring-ink-900/5 ring-inset">
                  <input
                    type="checkbox"
                    name={`pg-${gateway.provider}-sandbox`}
                    defaultChecked={gateway.sandbox}
                    className="h-4 w-4 accent-teal-600"
                  />
                  محیط تست (سندباکس)
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="mt-5 inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-navy-800 px-8 font-bold whitespace-nowrap text-white transition-colors hover:bg-navy-700"
        >
          ذخیره درگاه‌ها
        </button>
      </form>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-extrabold text-navy-900">
          <BadgeCheck className="h-5 w-5 text-teal-600" />
          تراکنش‌های موفق
        </h2>
        <TableShell head={["شماره سفارش", "هنرجو", "شرح", "مبلغ", "کد پیگیری", "وضعیت"]}>
          {paid.map((o) => (
            <tr key={o.id} className="transition-colors hover:bg-sand-50">
              <Td className="font-bold text-navy-800"><span dir="ltr">{o.id}</span></Td>
              <Td className="font-semibold">{o.student}</Td>
              <Td className="max-w-64 truncate text-ink-600">{o.item}</Td>
              <Td className="font-bold whitespace-nowrap">{formatPrice(o.amount)}</Td>
              <Td><span dir="ltr" className="text-ink-600">{o.refId ?? "—"}</span></Td>
              <Td><StatusBadge status={o.status} /></Td>
            </tr>
          ))}
        </TableShell>
      </section>
    </div>
  );
}
