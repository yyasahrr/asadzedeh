import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input } from "@/components/ui/Input";
import { getArticles, getCourses, getSeoEntries, getSeoRedirects, getSettings } from "@/lib/store";
import { saveSeoDefaults, saveSeoEntry } from "./actions";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = { ...noIndexMetadata("سئو"), title: "سئو" };

export default async function SeoAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await getSessionUser();
  if (!can(user, "seo")) return <Denied />;
  const { saved } = await searchParams;
  const settings = getSettings();
  const seo = settings.seo;
  const entries = getSeoEntries();
  const redirects = getSeoRedirects();
  const courses = getCourses();
  const missingTitle = courses.filter((c) => !c.title).length + getArticles().filter((a) => !a.title).length;
  const missingDesc = courses.filter((c) => !c.excerpt).length + getArticles().filter((a) => !a.excerpt).length;
  const missingOg = entries.filter((e) => !e.ogImage).length;
  const noindex = entries.filter((e) => e.index === false).length;
  const broken = redirects.filter((r) => r.fromPath === r.toPath || !r.fromPath.startsWith("/") || !r.toPath.startsWith("/"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">سئو</h1>
        <Link href="/admin/seo/redirects" className="text-sm font-bold text-teal-600 hover:text-teal-700">
          مدیریت ریدایرکت‌ها ←
        </Link>
      </div>
      {saved && (
        <p className="flex items-center gap-2 rounded-2xl bg-teal-50 px-5 py-3.5 text-sm font-bold text-teal-800 ring-1 ring-teal-600/25 ring-inset">
          <CheckCircle2 className="h-5 w-5" />
          تنظیمات سئو ذخیره شد.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "بدون عنوان", value: missingTitle },
          { label: "بدون توضیحات", value: missingDesc },
          { label: "بدون تصویر OG اختصاصی", value: missingOg },
          { label: "noindex دستی", value: noindex },
          { label: "ریدایرکت خراب", value: broken.length },
          { label: "ریدایرکت فعال", value: redirects.filter((r) => r.enabled).length },
        ].map((k) => (
          <div key={k.label} className="bento-surface p-5">
            <p className="text-[13px] font-bold text-ink-500">{k.label}</p>
            <p className="mt-1.5 text-2xl font-black text-navy-900">{k.value}</p>
          </div>
        ))}
      </div>

      <form action={saveSeoDefaults} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="font-extrabold text-navy-900">پیش‌فرض‌های سایت</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="defaultTitle">عنوان پیش‌فرض</FieldLabel>
            <Input id="defaultTitle" name="defaultTitle" defaultValue={seo?.defaultTitle} />
          </div>
          <div>
            <FieldLabel htmlFor="titleTemplate">قالب عنوان</FieldLabel>
            <Input id="titleTemplate" name="titleTemplate" defaultValue={seo?.titleTemplate || "%s | اسدزاده"} dir="ltr" className="text-left" />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="defaultDescription">توضیحات پیش‌فرض</FieldLabel>
            <Input id="defaultDescription" name="defaultDescription" defaultValue={seo?.defaultDescription} />
          </div>
          <div>
            <FieldLabel htmlFor="canonicalBaseUrl">آدرس Canonical پایه</FieldLabel>
            <Input id="canonicalBaseUrl" name="canonicalBaseUrl" defaultValue={seo?.canonicalBaseUrl || settings.site.siteUrl} dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="defaultOgImage">تصویر Open Graph پیش‌فرض</FieldLabel>
            <Input id="defaultOgImage" name="defaultOgImage" defaultValue={seo?.defaultOgImage} dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="siteName">نام سایت</FieldLabel>
            <Input id="siteName" name="siteName" defaultValue={seo?.siteName || settings.site.siteName} />
          </div>
          <div>
            <FieldLabel htmlFor="orgName">نام آموزشگاه (Schema)</FieldLabel>
            <Input id="orgName" name="orgName" defaultValue={seo?.organization?.name} />
          </div>
          <div>
            <FieldLabel htmlFor="orgPhone">تلفن</FieldLabel>
            <Input id="orgPhone" name="orgPhone" defaultValue={seo?.organization?.phone || settings.site.phone} />
          </div>
          <div>
            <FieldLabel htmlFor="orgAddress">نشانی</FieldLabel>
            <Input id="orgAddress" name="orgAddress" defaultValue={seo?.organization?.address || settings.site.address} />
          </div>
          <div>
            <FieldLabel htmlFor="orgHours">ساعات کاری</FieldLabel>
            <Input id="orgHours" name="orgHours" defaultValue={seo?.organization?.openingHours} />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-ink-700">
            <input type="checkbox" name="robotsIndex" defaultChecked={seo?.robotsIndex !== false} /> ایندکس پیش‌فرض
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-ink-700">
            <input type="checkbox" name="robotsFollow" defaultChecked={seo?.robotsFollow !== false} /> فالو پیش‌فرض
          </label>
        </div>
        <button type="submit" className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white hover:bg-navy-700">
          ذخیره پیش‌فرض‌ها
        </button>
      </form>

      <form action={saveSeoEntry} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="font-extrabold text-navy-900">سئوی صفحه / موجودیت</h2>
        <p className="mt-2 text-sm text-ink-600">اگر خالی بماند، عنوان و توضیح خود موجودیت استفاده می‌شود.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="entityType">نوع</FieldLabel>
            <select id="entityType" name="entityType" className="h-11 w-full rounded-xl border border-ink-900/10 bg-card px-3 text-sm">
              <option value="course">دوره</option>
              <option value="class">کلاس</option>
              <option value="path">مسیر</option>
              <option value="product">محصول</option>
              <option value="blog">مقاله</option>
              <option value="instructor">استاد</option>
              <option value="page">صفحه ثابت</option>
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="entityId">شناسه / اسلاگ</FieldLabel>
            <Input id="entityId" name="entityId" placeholder="carpet-weaving-foundations" dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="metaTitle">Meta Title</FieldLabel>
            <Input id="metaTitle" name="metaTitle" />
          </div>
          <div>
            <FieldLabel htmlFor="metaDescription">Meta Description</FieldLabel>
            <Input id="metaDescription" name="metaDescription" />
          </div>
          <div>
            <FieldLabel htmlFor="ogImage">OG Image</FieldLabel>
            <Input id="ogImage" name="ogImage" dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="imageAlt">Alt تصویر</FieldLabel>
            <Input id="imageAlt" name="imageAlt" />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="index" defaultChecked /> index
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="follow" defaultChecked /> follow
          </label>
        </div>
        <button type="submit" className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white hover:bg-navy-700">
          ذخیره سئوی موجودیت
        </button>
      </form>
    </div>
  );
}
