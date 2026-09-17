"use client";

import { useState } from "react";
import { FieldLabel, Input } from "@/components/ui/Input";
import { NeshanMap } from "@/components/workshop/NeshanMap";
import { OpenStreetMapPicker } from "./OpenStreetMapPicker";

export function WorkshopMapForm({ action, workshop, serviceConfigured }: {
  action: (data: FormData) => void;
  workshop: { lat: number; lng: number; address: string; mapProvider: "neshan" | "openstreetmap"; neshanWebMapKey?: string };
  serviceConfigured: boolean;
}) {
  const [provider, setProvider] = useState(workshop.mapProvider);
  return (
    <form action={action} className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5 sm:p-6">
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <div><FieldLabel htmlFor="ws-address">نشانی</FieldLabel><Input id="ws-address" name="address" defaultValue={workshop.address} required maxLength={300} /></div>
          <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
            <div><FieldLabel htmlFor="ws-lat">عرض جغرافیایی</FieldLabel><Input id="ws-lat" name="lat" type="number" min={-90} max={90} step="any" defaultValue={workshop.lat} required dir="ltr" className="text-left" /></div>
            <div><FieldLabel htmlFor="ws-lng">طول جغرافیایی</FieldLabel><Input id="ws-lng" name="lng" type="number" min={-180} max={180} step="any" defaultValue={workshop.lng} required dir="ltr" className="text-left" /></div>
          </div>
          <div><FieldLabel htmlFor="ws-provider">سرویس نقشه</FieldLabel><select id="ws-provider" name="mapProvider" value={provider} onChange={(event) => setProvider(event.target.value as typeof provider)} className="h-11 w-full rounded-xl border border-ink-900/10 px-4 text-sm"><option value="neshan">نشان</option><option value="openstreetmap">OpenStreetMap</option></select></div>
          {provider === "neshan" ? <div><FieldLabel htmlFor="ws-map-key">Neshan Web Map Key</FieldLabel><Input id="ws-map-key" name="neshanWebMapKey" defaultValue={workshop.neshanWebMapKey} dir="ltr" className="text-left font-mono" maxLength={200} autoComplete="off" /><p className="mt-1 text-xs text-ink-500">این کلید برای Web SDK مرورگر است و Secret سرویس نیست.</p></div> : null}
          <div className="rounded-xl bg-sand-100 p-3 text-sm"><span className="font-bold text-navy-900">اتصال Geocoding نشان: </span><span className={serviceConfigured ? "text-teal-700" : "text-madder-700"}>{serviceConfigured ? "تنظیم شده" : "تنظیم نشده"}</span><p className="mt-1 text-xs text-ink-500">مقدار Service API Key فقط از environment سرور خوانده می‌شود.</p></div>
        </div>
        <div className="min-w-0 overflow-hidden rounded-2xl ring-1 ring-ink-900/10">
          {provider === "neshan" ? <NeshanMap lat={workshop.lat} lng={workshop.lng} mapKey={workshop.neshanWebMapKey} /> : <OpenStreetMapPicker lat={workshop.lat} lng={workshop.lng} latInputName="lat" lngInputName="lng" />}
        </div>
      </div>
      <button type="submit" className="mt-5 inline-flex h-11 items-center rounded-xl bg-navy-800 px-8 font-bold text-white">ذخیره تنظیمات</button>
    </form>
  );
}
