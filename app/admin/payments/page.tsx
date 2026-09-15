import type { Metadata } from "next";
import { BadgeCheck, CheckCircle2, CreditCard } from "lucide-react";
import { getOrders, getSettings } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input, Select } from "@/components/ui/Input";
import { listDrivers, getDriver } from "@/lib/gateways/registry";
import { savePaymentSettings } from "../actions";

export const metadata: Metadata = { title: "پرداخت" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (!can(user, "payments")) return <Denied />;
  const { saved, error } = await searchParams;
  const payment = getSettings().payment;
  // Label the credential field after the gateway actually selected, so the
  // operator is never asked for a "merchant code" when they chose IDPay.
  const activeDriver = getDriver(payment.provider);
  const paid = getOrders().filter((o) => o.status === "پرداخت شده");

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
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <FieldLabel htmlFor="pg-provider">درگاه</FieldLabel>
            <Select id="pg-provider" name="provider" defaultValue={payment.provider}>
              <option value="demo">نمایشی (تستی — پرداخت فوری)</option>
              {listDrivers().map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="pg-merchant">{activeDriver?.credentialLabel ?? "شناسه درگاه"}</FieldLabel>
            <Input
              id="pg-merchant"
              name="merchantId"
              defaultValue={payment.merchantId}
              dir="ltr"
              className="text-left"
              placeholder={payment.merchantId ? "••••••••••••" : ""}
              autoComplete="off"
            />
          </div>
          {activeDriver?.needsSecret && (
            <div>
              <FieldLabel htmlFor="pg-secret">رمز کلاینت (Client Secret)</FieldLabel>
              <Input
                id="pg-secret"
                name="secret"
                type="password"
                defaultValue={payment.secret}
                dir="ltr"
                className="text-left"
                autoComplete="off"
              />
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl bg-sand-100 px-4 py-3 text-sm font-bold">
            <input type="checkbox" name="sandbox" defaultChecked={payment.sandbox} className="h-4 w-4 accent-teal-600" />
            محیط سندباکس (تست)
          </label>
          <div className="flex items-end">
            <button type="submit" className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-navy-800 px-6 font-bold whitespace-nowrap text-white transition-colors hover:bg-navy-700">
              ذخیره اتصال
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700 ring-1 ring-red-600/20 ring-inset">
            {error}
          </p>
        )}
        <p className="mt-3 text-[13px] leading-7 text-ink-500">
          در حالت نمایشی، پرداخت در تسویه‌حساب فوراً موفق ثبت می‌شود و در محیط پروداکشن در دسترس نیست. با
          انتخاب یک درگاه واقعی و وارد کردن اعتبارنامه آن، مشتری به درگاه هدایت و نتیجه به‌صورت
          سرور-به-سرور تأیید می‌شود. سندباکس برای زرین‌پال، آی‌دی‌پی و زیبال فعال است؛ پی‌پینگ محیط
          آزمایشی عمومی ندارد.
        </p>
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
