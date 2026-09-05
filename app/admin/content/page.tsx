import type { Metadata } from "next";
import { CheckCircle2, Megaphone } from "lucide-react";
import { getSettings } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { galleryImages } from "@/lib/seed";
import { Denied } from "@/components/admin/Denied";
import { UploadField } from "@/components/admin/UploadField";
import { FieldLabel, Input, Textarea } from "@/components/ui/Input";
import { saveSiteContent } from "../actions";

export const metadata: Metadata = { title: "محتوای سایت" };

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await getSessionUser();
  if (!can(user, "content")) return <Denied />;
  const { saved } = await searchParams;
  const site = getSettings().site;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">محتوای سایت</h1>
      {saved && (
        <p className="flex items-center gap-2 rounded-2xl bg-teal-50 px-5 py-3.5 text-sm font-bold text-teal-800 ring-1 ring-teal-600/25 ring-inset">
          <CheckCircle2 className="h-5 w-5" />
          تغییرات ذخیره و روی سایت اعمال شد.
        </p>
      )}

      <form action={saveSiteContent} className="space-y-6">
        {/* Announcement */}
        <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="flex items-center gap-2 font-extrabold text-navy-900">
            <Megaphone className="h-5 w-5 text-madder-700" />
            نوار اطلاع‌رسانی بالای سایت
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-sand-100 px-4 py-3 text-sm font-bold">
              <input type="checkbox" name="annEnabled" defaultChecked={site.announcement.enabled} className="h-4 w-4 accent-teal-600" />
              نمایش نوار اطلاع‌رسانی
            </label>
            <div>
              <FieldLabel htmlFor="annLink">لینک نوار</FieldLabel>
              <Input id="annLink" name="annLink" defaultValue={site.announcement.link} dir="ltr" className="text-left" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="annText">متن نوار</FieldLabel>
              <Input id="annText" name="annText" defaultValue={site.announcement.text} />
            </div>
          </div>
        </section>

        {/* Hero */}
        <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="font-extrabold text-navy-900">هیرو (بخش اول صفحه اصلی)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="heroBadge">نشان بالای تیتر</FieldLabel>
              <Input id="heroBadge" name="heroBadge" defaultValue={site.hero.badge} />
            </div>
            <div>
              <FieldLabel htmlFor="heroA">تیتر (بخش اول)</FieldLabel>
              <Input id="heroA" name="heroA" defaultValue={site.hero.titleA} />
            </div>
            <div>
              <FieldLabel htmlFor="heroHl">تیتر (بخش برجسته)</FieldLabel>
              <Input id="heroHl" name="heroHl" defaultValue={site.hero.titleHighlight} />
            </div>
            <div>
              <FieldLabel htmlFor="heroB">تیتر (بخش آخر)</FieldLabel>
              <Input id="heroB" name="heroB" defaultValue={site.hero.titleB} />
            </div>
            <div>
              <FieldLabel htmlFor="heroNote">متن روی تصویر</FieldLabel>
              <Input id="heroNote" name="heroNote" defaultValue={site.hero.note} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="heroSub">زیرتیتر</FieldLabel>
              <Textarea id="heroSub" name="heroSub" defaultValue={site.hero.subtitle} />
            </div>
            <div>
              <FieldLabel htmlFor="heroCta1">دکمه اصلی</FieldLabel>
              <Input id="heroCta1" name="heroCta1" defaultValue={site.hero.primaryCta} />
            </div>
            <div>
              <FieldLabel htmlFor="heroCta2">دکمه دوم</FieldLabel>
              <Input id="heroCta2" name="heroCta2" defaultValue={site.hero.secondaryCta} />
            </div>
            <div className="sm:col-span-2">
              <UploadField name="heroImage" label="تصویر هیرو" gallery={galleryImages} initial={site.hero.image} />
            </div>
          </div>
        </section>

        {/* Brand / contact / footer */}
        <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="font-extrabold text-navy-900">برند، تماس و فوتر</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="siteName">نام برند</FieldLabel>
              <Input id="siteName" name="siteName" defaultValue={site.siteName} />
            </div>
            <div>
              <FieldLabel htmlFor="tagline">زیرعنوان برند</FieldLabel>
              <Input id="tagline" name="tagline" defaultValue={site.tagline} />
            </div>
            <div>
              <FieldLabel htmlFor="phone">تلفن</FieldLabel>
              <Input id="phone" name="phone" defaultValue={site.phone} />
            </div>
            <div>
              <FieldLabel htmlFor="email">ایمیل</FieldLabel>
              <Input id="email" name="email" defaultValue={site.email} dir="ltr" className="text-left" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="address">آدرس</FieldLabel>
              <Input id="address" name="address" defaultValue={site.address} />
            </div>
            <div>
              <FieldLabel htmlFor="instagram">اینستاگرام (لینک)</FieldLabel>
              <Input id="instagram" name="instagram" defaultValue={site.socials.instagram} dir="ltr" className="text-left" />
            </div>
            <div>
              <FieldLabel htmlFor="telegram">تلگرام (لینک)</FieldLabel>
              <Input id="telegram" name="telegram" defaultValue={site.socials.telegram} dir="ltr" className="text-left" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="footerAbout">متن معرفی فوتر</FieldLabel>
              <Textarea id="footerAbout" name="footerAbout" defaultValue={site.footerAbout} />
            </div>
          </div>
        </section>

        {/* About */}
        <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="font-extrabold text-navy-900">صفحه «درباره ما»</h2>
          <div className="mt-4">
            <FieldLabel htmlFor="aboutIntro">متن معرفی (هر پاراگراف با یک خط خالی)</FieldLabel>
            <Textarea id="aboutIntro" name="aboutIntro" defaultValue={site.aboutIntro.join("\n\n")} className="min-h-40" />
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="inline-flex h-12 cursor-pointer items-center rounded-xl bg-navy-800 px-10 font-bold text-white transition-colors hover:bg-navy-700">
            ذخیره همه تغییرات
          </button>
          <div>
            <FieldLabel htmlFor="siteUrl">آدرس سایت (برای لینک‌ها و سئو)</FieldLabel>
            <Input id="siteUrl" name="siteUrl" defaultValue={site.siteUrl} dir="ltr" className="text-left" />
          </div>
        </div>
      </form>
    </div>
  );
}
