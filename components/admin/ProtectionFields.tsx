import { Cloud, Lock, ShieldCheck } from "lucide-react";
import type { CourseProtection } from "@/lib/types";

function Toggle({
  name,
  label,
  desc,
  checked,
}: {
  name: string;
  label: string;
  desc: string;
  checked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-sand-50 p-3 ring-1 ring-transparent hover:ring-ink-900/10">
      <input type="checkbox" name={name} value="1" defaultChecked={checked} className="mt-1 h-4 w-4 accent-teal-700" />
      <span>
        <span className="block text-sm font-bold text-ink-800">{label}</span>
        <span className="block text-xs leading-6 text-ink-500">{desc}</span>
      </span>
    </label>
  );
}

/**
 * Real protection model (RC):
 * - Videos live in private S3 bucket, never public.
 * - Playback only via /api/video/[id]/stream with signed token + enrolment check.
 * - No ffmpeg burn, no SpotPlayer DRM in this phase.
 */
export function ProtectionFields({
  value,
}: {
  value: CourseProtection;
  spotConfigured?: boolean;
  ffmpegAvailable?: boolean;
}) {
  return (
    <fieldset className="rounded-2xl border border-dashed border-ink-900/15 p-4 sm:col-span-2">
      <legend className="flex items-center gap-1.5 px-2 text-sm font-black text-navy-900">
        <ShieldCheck className="h-4 w-4 text-teal-700" /> حفاظت و پخش امن
      </legend>

      {/* Always-on secure delivery */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="flex gap-3 rounded-xl bg-teal-50 p-3 ring-1 ring-teal-200">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
          <div className="text-sm">
            <p className="font-black text-teal-900">پخش امن همیشه فعال</p>
            <p className="mt-1 text-xs leading-6 text-teal-800/80">
              ویدیوها در باکت خصوصی S3 نگهداری می‌شوند، هیچ URL عمومی تولید نمی‌شود. پخش فقط از مسیر{" "}
              <code dir="ltr" className="rounded bg-white px-1 py-0.5 text-[11px]">
                /api/video/[id]/stream
              </code>{" "}
              با توکن امضاشده کوتاه‌مدت، بررسی ثبت‌نام و احراز هویت انجام می‌شود. Range و Content-Disposition: inline پشتیبانی می‌شود.
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl bg-sand-50 p-3 ring-1 ring-ink-900/10">
          <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-navy-700" />
          <div className="text-sm">
            <p className="font-black text-ink-900">فضای ابری خصوصی</p>
            <p className="mt-1 text-xs leading-6 text-ink-600">
              مسیر ذخیره‌سازی: <code dir="ltr" className="text-[11px]">videos/</code> در Object Storage. باکت باید private باشد (بدون public-read).
              هیچ کلید یا credential به مرورگر ارسال نمی‌شود.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle
          name="p_overlayWatermark"
          label="واترمارک متحرک شماره موبایل"
          desc="شماره خریدار روی تصویر با جابه‌جایی دوره‌ای نمایش داده می‌شود؛ برای ردیابی نشت محتوا. این تنها واترمارک فعال در این نسخه است."
          checked={value.overlayWatermark}
        />
        <Toggle
          name="p_blockDownload"
          label="سخت‌گیری پلیر (غیرفعال‌سازی دانلود و PiP)"
          desc="راست‌کلیک، منوی دانلود مرورگر، تصویر‌در‌تصویر و پخش از راه دور در پلیر امن غیرفعال می‌شود. امنیت واقعی از توکن و احراز هویت می‌آید، نه از JS."
          checked={value.blockDownload}
        />
      </div>

      {/* Deprecated fields – forced to safe defaults, kept as hidden inputs so old forms don't break */}
      <input type="hidden" name="p_securePlayer" value="1" />
      <input type="hidden" name="p_burnWatermark" value="" />
      <input type="hidden" name="p_spotPlayer" value="" />
      <input type="hidden" name="p_spotIds" value="" />
      <input type="hidden" name="p_maxDevices" value="1" />

      <p className="mt-3 text-[11px] leading-6 text-ink-500">
        نکته: واترمارک حک‌شده با ffmpeg و تحویل با اسپات‌پلیر (DRM) در این نسخه غیرفعال است و عمداً از پنل حذف شده؛ طبق تصمیم RC، پردازش ویدیو و DRM خارج از محدوده است.
        فایل اصلی با پخش امن ارائه می‌شود و کپی لینک پخش به‌سرعت منقضی می‌شود (محدود به ویدیو + کاربر + User-Agent).
      </p>
    </fieldset>
  );
}
