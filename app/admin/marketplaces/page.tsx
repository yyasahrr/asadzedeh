import type { Metadata } from "next";
import { CheckCircle2, ExternalLink, Store } from "lucide-react";
import { getProducts, getSettings } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input } from "@/components/ui/Input";
import { saveMarketplaceSettings } from "../actions";
import { defaultMarketplaces } from "@/lib/seed";
import { toFa } from "@/lib/format";

export const metadata: Metadata = { title: "بازارگاه‌ها" };

const HINTS: Record<string, string> = {
  torob: "ترب فید محصولات را از آدرس زیر می‌خواند. همان آدرس را در پنل فروشندگان ترب ثبت کنید.",
  emalls: "ایمالز هم JSON و هم CSV را می‌پذیرد؛ برای CSV پارامتر format=csv را اضافه کنید.",
  basalam: "برای انتشار در باسلام، شناسه غرفه و توکن API را وارد کنید.",
  digikala: "برای دیجی‌کالا، شناسه فروشنده (Seller ID) و توکن پنل را وارد کنید.",
};

export default async function MarketplacesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await getSessionUser();
  if (!can(user, "shop")) return <Denied />;
  const { saved } = await searchParams;

  const settings = getSettings();
  const marketplaces = settings.marketplaces ?? { enabled: false, feedKey: "", channels: defaultMarketplaces };
  const stored = marketplaces.channels ?? [];
  const channels = defaultMarketplaces.map((fallback) => stored.find((c) => c.id === fallback.id) ?? fallback);

  const base = (settings.seo?.canonicalBaseUrl || settings.site.siteUrl || "").replace(/\/$/, "");
  const activeProducts = getProducts().filter((p) => p.active).length;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">اتصال به بازارگاه‌ها و موتورهای مقایسه قیمت</h1>
      {saved && (
        <p className="flex items-center gap-2 rounded-2xl bg-teal-50 px-5 py-3.5 text-sm font-bold text-teal-800 ring-1 ring-teal-600/25 ring-inset">
          <CheckCircle2 className="h-5 w-5" />
          تنظیمات بازارگاه‌ها ذخیره شد.
        </p>
      )}

      <form action={saveMarketplaceSettings} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
          <Store className="h-5 w-5 text-teal-600" />
          تنظیمات کلی فید محصولات
        </h2>
        <p className="mt-2 text-[13px] leading-7 text-ink-500">
          هر بازارگاه فهرست محصولات را از آدرس اختصاصی خودش می‌خواند؛ قیمت‌ها به تومان و موجودی لحظه‌ای ارسال می‌شود.
          در حال حاضر {toFa(activeProducts)} محصول فعال دارید.
          اگر «کلید فید» را پر کنید، فقط درخواست‌هایی که این کلید را همراه دارند پاسخ می‌گیرند.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl bg-sand-100 px-4 py-3 text-sm font-bold">
            <input type="checkbox" name="enabled" defaultChecked={marketplaces.enabled} className="h-4 w-4 accent-teal-600" />
            فعال بودن ارسال فید به بازارگاه‌ها
          </label>
          <div>
            <FieldLabel htmlFor="mk-key">کلید فید (اختیاری)</FieldLabel>
            <Input id="mk-key" name="feedKey" defaultValue={marketplaces.feedKey} dir="ltr" className="text-left" />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {channels.map((channel) => {
            const url = `${base}/api/marketplace/${channel.id}${marketplaces.feedKey ? `?key=${marketplaces.feedKey}` : ""}`;
            return (
              <div key={channel.id} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-900/5 ring-inset">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-navy-900">{channel.label}</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline"
                  >
                    {url} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="mt-1 text-[12px] leading-6 text-ink-500">{HINTS[channel.id]}</p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl bg-white px-4 py-3 text-sm font-bold ring-1 ring-ink-900/5 ring-inset">
                    <input
                      type="checkbox"
                      name={`mk-${channel.id}-enabled`}
                      defaultChecked={channel.enabled}
                      className="h-4 w-4 accent-teal-600"
                    />
                    فعال
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl bg-white px-4 py-3 text-sm font-bold ring-1 ring-ink-900/5 ring-inset">
                    <input
                      type="checkbox"
                      name={`mk-${channel.id}-inStockOnly`}
                      defaultChecked={channel.inStockOnly}
                      className="h-4 w-4 accent-teal-600"
                    />
                    فقط کالاهای موجود
                  </label>
                  <div>
                    <FieldLabel htmlFor={`mk-${channel.id}-vendorId`}>شناسه فروشنده / غرفه</FieldLabel>
                    <Input
                      id={`mk-${channel.id}-vendorId`}
                      name={`mk-${channel.id}-vendorId`}
                      defaultValue={channel.vendorId ?? ""}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor={`mk-${channel.id}-apiKey`}>توکن API (در صورت نیاز)</FieldLabel>
                    <Input
                      id={`mk-${channel.id}-apiKey`}
                      name={`mk-${channel.id}-apiKey`}
                      type="password"
                      dir="ltr"
                      className="text-left"
                      placeholder={channel.apiKey ? "••••••••  (برای تغییر، مقدار جدید بنویسید)" : ""}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <FieldLabel htmlFor={`mk-${channel.id}-utm`}>برچسب utm_source لینک‌ها</FieldLabel>
                    <Input
                      id={`mk-${channel.id}-utm`}
                      name={`mk-${channel.id}-utm`}
                      defaultValue={channel.utmSource ?? channel.id}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          className="mt-5 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700"
        >
          ذخیره تنظیمات بازارگاه‌ها
        </button>
      </form>
    </div>
  );
}
