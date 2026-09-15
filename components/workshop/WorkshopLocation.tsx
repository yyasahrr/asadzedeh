import { ExternalLink, Landmark, MapPin, Navigation } from "lucide-react";
import { getWorkshopMapLocation, WORKSHOP_ADDRESS } from "@/lib/neshan";
import { getSettings } from "@/lib/store";
import { NeshanMap } from "./NeshanMap";

export async function WorkshopLocation() {
  const location = await getWorkshopMapLocation();
  const settings = getSettings();
  const provider = settings.site.workshop?.mapProvider || "neshan";
  const lat = location?.lat ?? 37.5527;
  const lng = location?.lng ?? 45.0761;
  const displayedAddress = location?.address ?? WORKSHOP_ADDRESS;
  const neshanUrl = `https://neshan.org/maps/@${lat},${lng},16z,0p`;

  return (
    <section
      id="workshop-location"
      className="overflow-hidden rounded-xl bg-card ring-1 ring-ink-900/8"
      aria-labelledby="workshop-title"
    >
      <div className="grid lg:grid-cols-[minmax(280px,0.62fr)_1.38fr]">
        <div className="flex flex-col justify-between bg-navy-900 p-5 text-white sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold tracking-wide text-ochre-200">نشانی کارگاه حضوری</p>
              {location?.source === "neshan" ? (
                <span className="rounded-md bg-teal-600/25 px-2 py-1 text-[10px] font-bold text-teal-100">
                  دریافت‌شده از نشان
                </span>
              ) : null}
              {location?.source === "settings" ? (
                <span className="rounded-md bg-teal-600/25 px-2 py-1 text-[10px] font-bold text-teal-100">
                  تنظیمات پنل
                </span>
              ) : null}
            </div>
            <h2 id="workshop-title" className="mt-1.5 text-xl font-black">
              کارگاه اسدزاده در ارومیه
            </h2>
            <address className="mt-3 not-italic text-sm leading-7 text-white/80">
              {displayedAddress}
            </address>

            <div className="mt-4 rounded-lg bg-white/8 p-3">
              <p className="text-xs text-white/60">مدرس کارگاه</p>
              <p className="mt-0.5 text-base font-black text-ochre-200">استاد ناصر اسد زاده</p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5 border-t border-white/12 pt-4 text-xs text-white/65">
            <p className="flex items-center gap-2">
              <Landmark className="h-4 w-4 shrink-0 text-ochre-200" />
              نشانه مسیر: بانک سپه (انصار سابق)
            </p>
            <p className="flex items-center gap-2">
              <Navigation className="h-4 w-4 shrink-0 text-ochre-200" />
              ورود از خیابان عطایی به کوی دی
            </p>
          </div>

          <a
            href={neshanUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-sand-100 px-4 py-2 text-sm font-bold text-navy-900 transition-colors hover:bg-sand-200 focus-visible:outline-none"
          >
            باز کردن در مسیریاب
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="relative overflow-hidden">
          {provider === "openstreetmap" ? (
            <iframe
              title="نقشه OpenStreetMap"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
              className="h-80 w-full border-0"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          ) : location ? (
            <NeshanMap
              lat={location.lat}
              lng={location.lng}
              mapKey={process.env.NEXT_PUBLIC_NESHAN_MAP_KEY}
            />
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center bg-sand-100 px-6 text-center">
              <MapPin className="h-9 w-9 text-madder-700" />
              <p className="mt-3 font-black text-navy-900">مختصات کارگاه هنوز دریافت نشده است</p>
              <p className="mt-1 max-w-md text-sm leading-7 text-ink-600">
                کلید سرویس نشان را برای جست‌وجوی نشانی تنظیم کنید؛ یا مختصات دقیق را به‌عنوان fallback در متغیرهای محیطی قرار دهید.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
