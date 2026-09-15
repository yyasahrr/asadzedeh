import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Cloud, Info, ShieldCheck, Timer } from "lucide-react";
import { saveVideoSettings } from "../../actions";
import { Denied } from "@/components/admin/Denied";
import { ProtectionFields } from "@/components/admin/ProtectionFields";
import { FieldLabel, Input } from "@/components/ui/Input";
import { can, getSessionUser } from "@/lib/auth";
import { toFa } from "@/lib/format";
import { getSettings } from "@/lib/store";
import { storageKind } from "@/lib/storage";
import { objectStorageConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "تنظیمات امنیت ویدیو" };
export const dynamic = "force-dynamic";

export default async function VideoSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await getSessionUser();
  if (!user || !can(user, "videos")) return <Denied />;
  const { saved } = await searchParams;
  const s = getSettings();
  const kind = storageKind();
  const configured = objectStorageConfigured();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-ink-500">
          <Link href="/admin/videos" className="hover:text-teal-700">
            کتابخانه ویدیو
          </Link>{" "}
          / تنظیمات
        </p>
        <h1 className="mt-1 text-2xl font-black text-navy-900">تنظیمات امنیت و پخش ویدیو</h1>
        <p className="mt-1 text-sm text-ink-600">
          این مقادیر پیش‌فرض دوره‌های جدید هستند؛ هر دوره می‌تواند در فرم ویرایش خودش آن‌ها را تغییر دهد. پخش همیشه امن است و از فضای ابری خصوصی انجام می‌شود.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">
          <CircleCheck className="h-4 w-4" /> تنظیمات ذخیره شد.
        </div>
      )}

      <div className={`flex items-start gap-3 rounded-2xl p-4 ring-1 ${configured ? "bg-teal-50 ring-teal-200" : "bg-red-50 ring-red-200"}`}>
        <Cloud className={`mt-0.5 h-5 w-5 ${configured ? "text-teal-700" : "text-red-700"}`} />
        <div className="text-sm">
          <p className="font-black text-ink-900">
            وضعیت فضای ابری: {configured ? (kind === "s3" ? "متصل (S3 خصوصی)" : "لوکال — فقط برای توسعه") : "پیکربندی نشده — آپلود در production مسدود است"}
          </p>
          <p className="mt-1 text-xs leading-6 text-ink-600">
            ویدیوها در <code dir="ltr">videos/</code> ذخیره می‌شوند، هیچ URL عمومی تولید نمی‌شود. پخش فقط از{" "}
            <code dir="ltr">/api/video/[id]/stream</code> با توکن امضاشده کوتاه‌مدت و بررسی ثبت‌نام انجام می‌شود. برای production باید{" "}
            <code dir="ltr">S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY</code> تنظیم باشد.
          </p>
        </div>
      </div>

      <form action={saveVideoSettings} className="grid gap-6">
        {/* Protection defaults */}
        <section className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
          <h2 className="flex items-center gap-2 font-black text-navy-900 sm:col-span-2">
            <ShieldCheck className="h-5 w-5 text-teal-700" /> حفاظت پیش‌فرض دوره‌ها
          </h2>
          <ProtectionFields value={s.video.defaults} />
        </section>

        {/* Player + delivery */}
        <section className="grid gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-2">
          <h2 className="flex items-center gap-2 font-black text-navy-900 sm:col-span-2">
            <Timer className="h-5 w-5 text-teal-700" /> پلیر امن و لینک‌های امضاشده
          </h2>
          <div>
            <FieldLabel htmlFor="v-ttl">عمر لینک پخش (ثانیه)</FieldLabel>
            <Input id="v-ttl" name="signedUrlSeconds" inputMode="numeric" defaultValue={s.video.signedUrlSeconds} dir="ltr" className="text-left" />
            <p className="mt-1 text-xs text-ink-500">لینک‌ها به کاربر، ویدیو و مرورگر گره خورده‌اند و پلیر پیش از انقضا آن‌ها را تمدید می‌کند. حداقل ۶۰ ثانیه.</p>
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
              <span className="text-xs text-ink-500" dir="ltr">
                {s.video.playerColor}
              </span>
            </div>
          </div>

          <div className="sm:col-span-2 rounded-xl bg-sand-50 p-3 text-xs leading-6 text-ink-600">
            <div className="flex gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" />
              <span>
                در این نسخه تبدیل HLS و واترمارک حک‌شده با ffmpeg غیرفعال است (عمداً). فایل اصلی با پخش امن ارائه می‌شود.
                کپی لینک پخش به‌سرعت منقضی می‌شود و در صورت خروج کاربر، بلافاصله بی‌اعتبار می‌شود. هیچ ویدیویی با URL مستقیم S3 در HTML یا API بازگردانده نمی‌شود.
              </span>
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
