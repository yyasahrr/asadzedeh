import Link from "next/link";
import { Hammer, Package } from "lucide-react";
import type { Product } from "@/lib/types";
import { galleryImages } from "@/lib/seed";
import { getSettings } from "@/lib/store";
import { FieldLabel, Input, Textarea } from "../ui/Input";
import { UploadField } from "./UploadField";

const categories = ["دار قالی", "ابزار", "نخ و الیاف", "نقشه", "رنگ و مواد", "کتاب", "سایر"];

export function ProductForm({ action, initial, submitLabel }: { action: (fd: FormData) => void; initial?: Product | null; submitLabel: string }) {
  const p = initial ?? null;
  const shop = getSettings().shop;
  return (
    <form action={action} className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
      {p && <input type="hidden" name="slug" value={p.slug} />}

      <div className="sm:col-span-2">
        <FieldLabel htmlFor="p-title">نام محصول *</FieldLabel>
        <Input id="p-title" name="title" required defaultValue={p?.title} placeholder="مثلاً: دار قالی رومیزی ۶۰×۸۰" />
      </div>
      {!p && (
        <div>
          <FieldLabel htmlFor="p-slug">نامک انگلیسی (اختیاری)</FieldLabel>
          <Input id="p-slug" name="slug" placeholder="loom-tabletop-60" dir="ltr" className="text-left" />
        </div>
      )}
      <div>
        <FieldLabel htmlFor="p-cat">دسته</FieldLabel>
        <Input id="p-cat" name="category" list="p-cats" defaultValue={p?.category ?? categories[0]} />
        <datalist id="p-cats">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div>
        <FieldLabel htmlFor="p-sku">کد کالا (SKU)</FieldLabel>
        <Input id="p-sku" name="sku" defaultValue={p?.sku} dir="ltr" className="text-left" placeholder="AZ-LOOM-60" />
      </div>

      {/* Kind */}
      <fieldset className="grid gap-3 rounded-2xl border border-dashed border-ink-900/15 p-4 sm:col-span-2 sm:grid-cols-2">
        <legend className="px-2 text-sm font-black text-navy-900">نوع محصول</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-sand-50 p-3">
          <input type="radio" name="kind" value="physical" defaultChecked={(p?.kind ?? "physical") === "physical"} className="mt-1 h-4 w-4 accent-teal-700" />
          <span><span className="flex items-center gap-1.5 text-sm font-bold text-ink-800"><Package className="h-4 w-4" /> کالای آماده (از انبار)</span><span className="block text-xs leading-6 text-ink-500">با موجودی مشخص؛ خرید مستقیم از سبد.</span></span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-sand-50 p-3">
          <input type="radio" name="kind" value="preorder" defaultChecked={p?.kind === "preorder"} className="mt-1 h-4 w-4 accent-teal-700" />
          <span><span className="flex items-center gap-1.5 text-sm font-bold text-ink-800"><Hammer className="h-4 w-4" /> ساخت سفارشی (پیش‌سفارش)</span><span className="block text-xs leading-6 text-ink-500">مشتری درخواست ثبت می‌کند؛ قیمت قطعی و بیعانه بعداً تعیین می‌شود.</span></span>
        </label>
        <div>
          <FieldLabel htmlFor="p-dep">درصد بیعانه (پیش‌سفارش)</FieldLabel>
          <Input id="p-dep" name="depositPercent" inputMode="numeric" defaultValue={p?.preorder?.depositPercent ?? shop.preorderDepositPercent} dir="ltr" className="text-left" />
        </div>
        <div>
          <FieldLabel htmlFor="p-lead">زمان ساخت (روز کاری)</FieldLabel>
          <Input id="p-lead" name="leadTimeDays" inputMode="numeric" defaultValue={p?.preorder?.leadTimeDays ?? 21} dir="ltr" className="text-left" />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="p-ponote">توضیح بالای فرم پیش‌سفارش</FieldLabel>
          <Input id="p-ponote" name="preorderNote" defaultValue={p?.preorder?.note} placeholder="مثلاً: قیمت نهایی بر اساس ابعاد و جنس چوب اعلام می‌شود." />
        </div>
      </fieldset>

      {/* Price & stock */}
      <div>
        <FieldLabel htmlFor="p-price">قیمت (تومان) *</FieldLabel>
        <Input id="p-price" name="price" required inputMode="numeric" defaultValue={p?.price} dir="ltr" className="text-left" placeholder="3900000" />
      </div>
      <div>
        <FieldLabel htmlFor="p-old">قیمت قبل از تخفیف</FieldLabel>
        <Input id="p-old" name="oldPrice" inputMode="numeric" defaultValue={p?.oldPrice ?? ""} dir="ltr" className="text-left" />
      </div>
      <div>
        <FieldLabel htmlFor="p-stock">موجودی انبار</FieldLabel>
        <Input id="p-stock" name="stock" inputMode="numeric" defaultValue={p?.stock ?? 0} dir="ltr" className="text-left" />
      </div>
      <div>
        <FieldLabel htmlFor="p-weight">وزن (گرم) — برای محاسبه ارسال</FieldLabel>
        <Input id="p-weight" name="weightGrams" inputMode="numeric" defaultValue={p?.weightGrams ?? 0} dir="ltr" className="text-left" />
      </div>
      <div className="flex flex-wrap gap-4 sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
          <input type="checkbox" name="allowBackorder" value="1" defaultChecked={p?.allowBackorder} className="h-4 w-4 accent-teal-700" /> فروش در صورت اتمام موجودی (پیش‌خرید)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
          <input type="checkbox" name="featured" value="1" defaultChecked={p?.featured} className="h-4 w-4 accent-teal-700" /> محصول ویژه
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
          <input type="checkbox" name="active" value="1" defaultChecked={p ? p.active : true} className="h-4 w-4 accent-teal-700" /> فعال (نمایش در فروشگاه)
        </label>
      </div>

      {/* Shipping */}
      <fieldset className="rounded-2xl border border-dashed border-ink-900/15 p-4 sm:col-span-2">
        <legend className="px-2 text-sm font-black text-navy-900">روش‌های ارسال مجاز</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {shop.shippingMethods.map((m) => (
            <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-xl bg-sand-50 p-3 ${!m.active ? "opacity-60" : ""}`}>
              <input type="checkbox" name="shippingMethods" value={m.id} defaultChecked={p ? p.shippingMethods.includes(m.id) : m.active} className="h-4 w-4 accent-teal-700" />
              <span className="min-w-0 flex-1 text-sm font-bold text-ink-800">{m.label}<span className="block text-xs font-normal text-ink-500">{m.description}</span></span>
              <span className="text-xs text-ink-600">{m.cost === 0 ? "رایگان" : `${m.cost.toLocaleString("fa-IR")} ت`}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-500">
          روش‌های ارسال و هزینه‌ها را در <Link href="/admin/shop/settings" className="font-bold text-teal-700">تنظیمات فروشگاه</Link> ویرایش کنید.
        </p>
      </fieldset>

      {/* Media & content */}
      <div className="sm:col-span-2">
        <UploadField name="image" label="تصویر اصلی" gallery={galleryImages} initial={p?.image} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="p-gallery">گالری (هر خط یک مسیر تصویر؛ از رسانه آپلود کنید)</FieldLabel>
        <Textarea id="p-gallery" name="gallery" defaultValue={p?.gallery.join("\n")} className="min-h-20" dir="ltr" placeholder={"/uploads/loom-1.jpg\n/uploads/loom-2.jpg"} />
      </div>
      <div>
        <FieldLabel htmlFor="p-badge">نشان (اختیاری)</FieldLabel>
        <Input id="p-badge" name="badge" defaultValue={p?.badge} placeholder="پرفروش، جدید، پیش‌سفارش" />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="p-excerpt">معرفی کوتاه</FieldLabel>
        <Textarea id="p-excerpt" name="excerpt" defaultValue={p?.excerpt} className="min-h-20" />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="p-desc">توضیحات کامل (هر پاراگراف در یک خط)</FieldLabel>
        <Textarea id="p-desc" name="description" defaultValue={p?.description.join("\n")} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel htmlFor="p-specs">مشخصات فنی (هر خط: عنوان: مقدار) — برای پیش‌سفارش، همین‌ها فیلدهای فرم مشتری می‌شوند</FieldLabel>
        <Textarea id="p-specs" name="specs" defaultValue={p?.specs.map((s) => `${s.label}: ${s.value}`).join("\n")} placeholder={"جنس: چوب راش\nابعاد مفید: ۶۰×۸۰ سانتی‌متر"} />
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 text-[15px] font-bold text-white transition-colors hover:bg-navy-700">
          {submitLabel}
        </button>
        <Link href="/admin/shop" className="inline-flex h-11 items-center rounded-xl bg-sand-200 px-6 text-sm font-bold text-ink-700 transition-colors hover:bg-sand-300">
          انصراف
        </Link>
      </div>
    </form>
  );
}
