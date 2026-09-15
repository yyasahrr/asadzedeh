import type { Metadata } from "next";
import { MapPinned } from "lucide-react";
import { getSettings } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input } from "@/components/ui/Input";
import { OpenStreetMapPicker } from "@/components/admin/OpenStreetMapPicker";
import { saveWorkshopLocation } from "../actions/workshop";

export const metadata: Metadata = { title: "نقشه کارگاه" };

export default async function AdminWorkshopPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !can(user, "settings")) return <Denied />;

  const { saved } = await searchParams;
  const settings = getSettings();
  const workshop = settings.site.workshop;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">نقشه و مکان کارگاه</h1>
      {saved && (
        <p className="flex items-center gap-2 rounded-2xl bg-teal-50 px-5 py-3.5 text-sm font-bold text-teal-800 ring-1 ring-teal-600/25 ring-inset">
          <MapPinned className="h-5 w-5" />
          موقعیت کارگاه ذخیره شد.
        </p>
      )}

      <form action={saveWorkshopLocation} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="ws-address">نشانی</FieldLabel>
              <Input id="ws-address" name="address" defaultValue={workshop?.address} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="ws-lat">عرض جغرافیایی</FieldLabel>
                <Input id="ws-lat" name="lat" type="number" step="any" defaultValue={workshop?.lat} required dir="ltr" className="text-left" />
              </div>
              <div>
                <FieldLabel htmlFor="ws-lng">طول جغرافیایی</FieldLabel>
                <Input id="ws-lng" name="lng" type="number" step="any" defaultValue={workshop?.lng} required dir="ltr" className="text-left" />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="ws-provider">سرویس نقشه</FieldLabel>
              <select id="ws-provider" name="mapProvider" defaultValue={workshop?.mapProvider || "neshan"} className="h-11 w-full rounded-xl border border-ink-900/10 px-4 text-sm focus:border-teal-600 focus:outline-none">
                <option value="neshan">نشان</option>
                <option value="openstreetmap">OpenStreetMap</option>
              </select>
              <p className="mt-1 text-xs text-ink-500">این گزینه تعیین می‌کند در صفحه عمومی از کدام سرویس نقشه استفاده شود.</p>
            </div>
          </div>
          <div>
            <OpenStreetMapPicker
              lat={workshop?.lat ?? 37.5527}
              lng={workshop?.lng ?? 45.0761}
              latInputName="lat"
              lngInputName="lng"
            />
          </div>
        </div>
        <button type="submit" className="mt-5 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white transition-colors hover:bg-navy-700">
          ذخیره موقعیت
        </button>
      </form>
    </div>
  );
}
