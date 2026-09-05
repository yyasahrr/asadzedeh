import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, ExternalLink, Info, KeyRound, MonitorSmartphone, ShieldCheck, Timer } from "lucide-react";
import { saveVideoSettings } from "../../actions";
import { Denied } from "@/components/admin/Denied";
import { ProtectionFields } from "@/components/admin/ProtectionFields";
import { FieldLabel, Input } from "@/components/ui/Input";
import { can, getSessionUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { spotPlayerConfigured } from "@/lib/spotplayer";
import { getSettings } from "@/lib/store";
import { findFfmpeg } from "@/lib/video";

export const metadata: Metadata = { title: "تنظیمات امنیت ویدیو" };
export const dynamic = "force-dynamic";

function DeviceInput({ name, label, value }: { name: string; label: string; value: number }) {
  return (
    <div>
      <FieldLabel htmlFor={`sp-${name}`}>{label}</FieldLabel>
      <Input id={`sp-${name}`} name={name} inputMode="numeric" defaultValue={value} dir="ltr" className="text-left" />
    </div>
  );
}

export default async function VideoSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await getSessionUser();
  if (!user || !can(user, "videos")) return <Denied />;
  const { saved } = await searchParams;
  const s = getSettings();
  const ffmpeg = findFfmpeg();
  const sp = s.spotplayer;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-ink-500">
          <Link href="/admin/videos" className="hover:text-teal-700">کتابخانه ویدیو</Link> / تنظیمات
        </p>
        <h1 className="mt-1 text-2xl font-black text-navy-900">تنظیمات امنیت و پخش ویدیو</h1>
        <p className="mt-1 text-sm text-ink-600">این مقادیر پیش‌فرض دوره‌های جدید هستند؛ هر دوره می‌تواند در فرم ویرایش خودش آن‌ها را تغییر دهد.</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
          <CircleCheck className="h-4 w-4" /> تنظیمات ذخیره شد.
        </div>
      )}

      <form action={saveVideoSettings} className="grid gap-6">
        {/* Protection defaults */}
        <section className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
          <h2 className="flex items-center gap-2 font-black text-navy-900 sm:col-span-2">
            <ShieldCheck className="h-5 w-5 text-teal-700" /> حفاظت پیش‌فرض دوره‌ها
          </h2>
          <ProtectionFields value={s.video.defaults} spotConfigured={spotPlayerConfigured()} ffmpegAvailable={!!ffmpeg} />
        </section>

        {/* Player + delivery */}
        <section className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
          <h2 className="flex items-center gap-2 font-black text-navy-900 sm:col-span-2">
            <Timer className="h-5 w-5 text-teal-700" /> پلیر امن و لینک‌های امضاشده
          </h2>
          <div>
            <FieldLabel htmlFor="v-ttl">عمر لینک پخش (ثانیه)</FieldLabel>
            <Input id="v-ttl" name="signedUrlSeconds" inputMode="numeric" defaultValue={s.video.signedUrlSeconds} dir="ltr" className="text-left" />
            <p className="mt-1 text-xs text-ink-500">لینک‌ها به کاربر، ویدیو و مرورگر گره خورده‌اند و پلیر پیش از انقضا آن‌ها را تمدید می‌کند.</p>
          </div>
          <div>
            <FieldLabel htmlFor="v-int">فاصله جابه‌جایی واترمارک (ثانیه)</FieldLabel>
            <Input id="v-int" name="watermarkIntervalSec" inputMode="numeric" defaultValue={s.video.watermarkIntervalSec} dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="v-extra">متن اضافه کنار شماره (اختیاری)</FieldLabel>
            <Input id="v-extra" name="watermarkExtra" defaultValue={s.video.watermarkExtra} placeholder="مثلاً: asadzadeh.ir" />
          </div>
          <div>
            <FieldLabel htmlFor="v-color">رنگ پلیر</FieldLabel>
            <div className="flex items-center gap-2">
              <input id="v-color" name="playerColor" type="color" defaultValue={s.video.playerColor} className="h-11 w-16 cursor-pointer rounded-xl border border-ink-900/10 bg-white p-1" />
              <span className="text-xs text-ink-500" dir="ltr">{s.video.playerColor}</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-sand-50 p-3">
              <input type="checkbox" name="transcode" value="1" defaultChecked={s.video.transcode} className="mt-1 h-4 w-4 accent-teal-700" />
              <span>
                <span className="block text-sm font-bold text-ink-800">تبدیل خودکار به HLS پس از آپلود</span>
                <span className="block text-xs leading-6 text-ink-500">
                  ویدیو به قطعات رمزنگاری‌نشده اما امضاشده (m3u8/ts) تبدیل می‌شود؛ دانلود یک‌جای فایل عملاً ناممکن است.
                  {ffmpeg ? ` ffmpeg: ${ffmpeg}` : " ffmpeg در دسترس نیست — تا نصب، فایل اصلی با پلیر امن پخش می‌شود."}
                </span>
              </span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="v-ffmpeg">مسیر ffmpeg</FieldLabel>
            <Input id="v-ffmpeg" name="ffmpegPath" defaultValue={s.video.ffmpegPath} placeholder="auto (جست‌وجوی خودکار) یا مثلاً /usr/bin/ffmpeg" dir="ltr" className="text-left" />
          </div>
        </section>

        {/* SpotPlayer */}
        <section className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
            <h2 className="flex items-center gap-2 font-black text-navy-900">
              <KeyRound className="h-5 w-5 text-teal-700" /> اتصال به اسپات‌پلیر (DRM)
            </h2>
            <a href="https://spotplayer.ir/help/api" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline">
              مستندات API <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-sand-50 p-3 text-xs leading-6 text-ink-600 sm:col-span-2">
            <Info className="mt-1 h-4 w-4 shrink-0 text-navy-700" />
            <span>
              با فعال‌سازی، برای هر خرید دوره‌ای که «تحویل با اسپات‌پلیر» دارد، یک لایسنس با نام و شماره خریدار (به‌عنوان واترمارک) ساخته و لینک آن پیامک می‌شود.
              بدون کلید API، سامانه در «حالت نمایشی» کلید شبیه‌سازی‌شده می‌سازد تا جریان خرید کامل تست شود.
            </span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
            <input type="checkbox" name="spEnabled" value="1" defaultChecked={sp.enabled} className="h-4 w-4 accent-teal-700" /> فعال باشد
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-700">
            <input type="checkbox" name="spTest" value="1" defaultChecked={sp.test} className="h-4 w-4 accent-teal-700" /> لایسنس تستی (بدون هزینه)
          </label>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="sp-key">کلید API</FieldLabel>
            <Input id="sp-key" name="spApiKey" type="password" placeholder={sp.apiKey ? `••••••••${sp.apiKey.slice(-4)} (برای تغییر، مقدار جدید وارد کنید)` : "کلید API از پنل اسپات‌پلیر"} dir="ltr" className="text-left" autoComplete="off" />
            <input type="hidden" name="spKeepKey" value="1" />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="sp-course">شناسه دوره پیش‌فرض اسپات‌پلیر</FieldLabel>
            <Input id="sp-course" name="spDefaultCourse" defaultValue={sp.defaultCourseId} placeholder="برای دوره‌هایی که شناسه اختصاصی ندارند" dir="ltr" className="text-left" />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink-700"><MonitorSmartphone className="h-4 w-4" /> سقف دستگاه‌ها (۰ = ممنوع)</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <DeviceInput name="spAll" label="کل" value={sp.devices.all} />
              <DeviceInput name="spWin" label="ویندوز" value={sp.devices.windows} />
              <DeviceInput name="spMac" label="مک" value={sp.devices.mac} />
              <DeviceInput name="spAnd" label="اندروید" value={sp.devices.android} />
              <DeviceInput name="spIos" label="iOS" value={sp.devices.ios} />
              <DeviceInput name="spWeb" label="وب" value={sp.devices.web} />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 text-[15px] font-bold text-white hover:bg-navy-700">
            ذخیره تنظیمات
          </button>
          <Link href="/admin/videos" className="inline-flex h-11 items-center rounded-xl bg-sand-200 px-6 text-sm font-bold text-ink-700 hover:bg-sand-300">
            بازگشت
          </Link>
          <span className="text-xs text-ink-500">آخرین تغییر تنظیمات در گزارش رویدادها ثبت می‌شود • عمر فعلی لینک: {toFa(s.video.signedUrlSeconds)} ثانیه</span>
        </div>
      </form>
    </div>
  );
}
