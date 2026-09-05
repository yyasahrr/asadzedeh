import { ShieldCheck } from "lucide-react";
import type { CourseProtection } from "@/lib/types";
import { FieldLabel, Input } from "../ui/Input";

/**
 * Per-course content protection settings.
 * Field names: p_securePlayer, p_burnWatermark, p_overlayWatermark, p_spotPlayer, p_spotIds, p_maxDevices, p_blockDownload
 */
function Toggle({ name, label, desc, checked, disabled }: { name: string; label: string; desc: string; checked: boolean; disabled?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl bg-sand-50 p-3 ${disabled ? "opacity-60" : ""}`}>
      <input type="checkbox" name={name} value="1" defaultChecked={checked} className="mt-1 h-4 w-4 accent-teal-700" />
      <span>
        <span className="block text-sm font-bold text-ink-800">{label}</span>
        <span className="block text-xs leading-6 text-ink-500">{desc}</span>
      </span>
    </label>
  );
}

export function ProtectionFields({ value, spotConfigured, ffmpegAvailable }: { value: CourseProtection; spotConfigured: boolean; ffmpegAvailable: boolean }) {
  return (
    <fieldset className="rounded-2xl border border-dashed border-ink-900/15 p-4 sm:col-span-2">
      <legend className="flex items-center gap-1.5 px-2 text-sm font-black text-navy-900">
        <ShieldCheck className="h-4 w-4 text-teal-700" /> حفاظت از محتوای دوره
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle name="p_securePlayer" label="پخش با پلیر امن سایت" desc="لینک‌های امضاشده و کوتاه‌مدت، پخش تکه‌ای، بدون امکان دانلود مستقیم." checked={value.securePlayer} />
        <Toggle name="p_overlayWatermark" label="واترمارک متحرک شماره موبایل" desc="شماره خریدار روی تصویر، با جابه‌جایی دوره‌ای؛ برای ردیابی نشت محتوا." checked={value.overlayWatermark} />
        <Toggle
          name="p_burnWatermark"
          label="واترمارک حک‌شده در فایل (ffmpeg)"
          desc={ffmpegAvailable ? "نسخه اختصاصی هر خریدار با شماره موبایل حک‌شده در خود ویدیو ساخته می‌شود." : "ffmpeg روی سرور پیدا نشد؛ این گزینه تا نصب ffmpeg بی‌اثر است (تنظیمات ویدیو)."}
          checked={value.burnWatermark}
          disabled={!ffmpegAvailable}
        />
        <Toggle name="p_blockDownload" label="مسدودسازی دانلود و PiP" desc="غیرفعال‌سازی راست‌کلیک، منوی دانلود مرورگر و تصویر‌در‌تصویر." checked={value.blockDownload} />
        <Toggle
          name="p_spotPlayer"
          label="تحویل با اسپات‌پلیر (DRM)"
          desc={spotConfigured ? "برای هر خرید، لایسنس اسپات‌پلیر با شماره خریدار صادر و پیامک می‌شود." : "کلید API اسپات‌پلیر تنظیم نشده؛ در حالت نمایشی لایسنس شبیه‌سازی می‌شود (تنظیمات ویدیو)."}
          checked={value.spotPlayer}
        />
        <div className="grid gap-3">
          <div>
            <FieldLabel htmlFor="p-spotIds">شناسه دوره در اسپات‌پلیر</FieldLabel>
            <Input id="p-spotIds" name="p_spotIds" defaultValue={value.spotPlayerCourseIds.join(", ")} placeholder="مثلاً: 5f1c…, 6a2b…" dir="ltr" className="text-left" />
          </div>
          <div>
            <FieldLabel htmlFor="p-maxDevices">حداکثر دستگاه هم‌زمان</FieldLabel>
            <Input id="p-maxDevices" name="p_maxDevices" inputMode="numeric" defaultValue={value.maxDevices} dir="ltr" className="text-left" />
          </div>
        </div>
      </div>
    </fieldset>
  );
}
