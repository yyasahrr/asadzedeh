import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Hammer, Plus, Store, Truck } from "lucide-react";
import { saveShopSettings } from "../../actions";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input, Textarea } from "@/components/ui/Input";
import { can, getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "تنظیمات فروشگاه" };
export const dynamic = "force-dynamic";

export default async function ShopSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await getSessionUser();
  if (!user || !can(user, "shop")) return <Denied />;
  const { saved } = await searchParams;
  const shop = getSettings().shop;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-ink-500"><Link href="/admin/shop" className="hover:text-teal-700">فروشگاه</Link> / تنظیمات</p>
        <h1 className="mt-1 text-2xl font-black text-navy-900">تنظیمات فروشگاه و روش‌های ارسال</h1>
      </div>
      {saved && (
        <div className="flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800"><CircleCheck className="h-4 w-4" /> تنظیمات ذخیره شد.</div>
      )}

      <form action={saveShopSettings} className="grid gap-6">
        <section className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
          <h2 className="flex items-center gap-2 font-black text-navy-900 sm:col-span-2"><Store className="h-5 w-5 text-teal-700" /> عمومی</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700 sm:col-span-2">
            <input type="checkbox" name="enabled" value="1" defaultChecked={shop.enabled} className="h-4 w-4 accent-teal-700" /> فروشگاه فعال باشد (امکان خرید و ثبت پیش‌سفارش)
          </label>
          <div>
            <FieldLabel htmlFor="s-title">عنوان فروشگاه</FieldLabel>
            <Input id="s-title" name="title" defaultValue={shop.title} />
          </div>
          <div>
            <FieldLabel htmlFor="s-free">ارسال رایگان برای سفارش‌های بالای (تومان؛ ۰ = غیرفعال)</FieldLabel>
            <Input id="s-free" name="freeShippingOver" inputMode="numeric" defaultValue={shop.freeShippingOver} dir="ltr" className="text-left" />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="s-desc">توضیح کوتاه بالای فروشگاه</FieldLabel>
            <Textarea id="s-desc" name="description" defaultValue={shop.description} className="min-h-20" />
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
          <h2 className="flex items-center gap-2 font-black text-navy-900 sm:col-span-2"><Hammer className="h-5 w-5 text-teal-700" /> پیش‌سفارش (ساخت سفارشی)</h2>
          <div>
            <FieldLabel htmlFor="s-dep">درصد بیعانه پیش‌فرض</FieldLabel>
            <Input id="s-dep" name="preorderDepositPercent" inputMode="numeric" defaultValue={shop.preorderDepositPercent} dir="ltr" className="text-left" />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="s-intro">متن معرفی پیش‌سفارش</FieldLabel>
            <Textarea id="s-intro" name="preorderIntro" defaultValue={shop.preorderIntro} />
          </div>
        </section>

        <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="mb-4 flex items-center gap-2 font-black text-navy-900"><Truck className="h-5 w-5 text-teal-700" /> روش‌های ارسال</h2>
          <div className="space-y-3">
            {shop.shippingMethods.map((m) => (
              <div key={m.id} className="grid gap-3 rounded-xl bg-sand-50 p-4 sm:grid-cols-[auto_1.2fr_2fr_1fr_1fr]">
                <label className="flex items-center gap-2 text-xs font-bold text-ink-700">
                  <input type="checkbox" name={`m_${m.id}_active`} value="1" defaultChecked={m.active} className="h-4 w-4 accent-teal-700" /> فعال
                </label>
                <div>
                  <FieldLabel htmlFor={`m-${m.id}-label`}>نام</FieldLabel>
                  <Input id={`m-${m.id}-label`} name={`m_${m.id}_label`} defaultValue={m.label} />
                  <p className="mt-1 text-[10px] text-ink-400" dir="ltr">id: {m.id}</p>
                </div>
                <div>
                  <FieldLabel htmlFor={`m-${m.id}-desc`}>توضیح</FieldLabel>
                  <Input id={`m-${m.id}-desc`} name={`m_${m.id}_desc`} defaultValue={m.description} />
                </div>
                <div>
                  <FieldLabel htmlFor={`m-${m.id}-cost`}>هزینه (تومان)</FieldLabel>
                  <Input id={`m-${m.id}-cost`} name={`m_${m.id}_cost`} inputMode="numeric" defaultValue={m.cost} dir="ltr" className="text-left" />
                </div>
                <div>
                  <FieldLabel htmlFor={`m-${m.id}-eta`}>زمان تحویل</FieldLabel>
                  <Input id={`m-${m.id}-eta`} name={`m_${m.id}_eta`} defaultValue={m.etaDays} />
                </div>
              </div>
            ))}
            <div className="grid gap-3 rounded-xl border-2 border-dashed border-ink-900/10 p-4 sm:grid-cols-[1.2fr_2fr_1fr_1fr_auto]">
              <div>
                <FieldLabel htmlFor="new-label">روش جدید — نام</FieldLabel>
                <Input id="new-label" name="new_label" placeholder="مثلاً: پیک موتوری تهران" />
              </div>
              <div>
                <FieldLabel htmlFor="new-desc">توضیح</FieldLabel>
                <Input id="new-desc" name="new_desc" placeholder="فقط داخل تهران" />
              </div>
              <div>
                <FieldLabel htmlFor="new-cost">هزینه</FieldLabel>
                <Input id="new-cost" name="new_cost" inputMode="numeric" dir="ltr" className="text-left" placeholder="80000" />
              </div>
              <div>
                <FieldLabel htmlFor="new-eta">زمان</FieldLabel>
                <Input id="new-eta" name="new_eta" placeholder="همان روز" />
              </div>
              <div className="flex items-end">
                <span className="inline-flex h-11 items-center gap-1 text-xs font-bold text-ink-500"><Plus className="h-4 w-4" /> با ذخیره اضافه می‌شود</span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 text-[15px] font-bold text-white hover:bg-navy-700">ذخیره تنظیمات</button>
          <Link href="/admin/shop" className="inline-flex h-11 items-center rounded-xl bg-sand-200 px-6 text-sm font-bold text-ink-700 hover:bg-sand-300">بازگشت</Link>
        </div>
      </form>
    </div>
  );
}
