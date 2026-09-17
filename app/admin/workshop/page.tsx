import type { Metadata } from "next";
import { MapPinned } from "lucide-react";
import { getSettings } from "@/lib/store";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { WorkshopMapForm } from "@/components/admin/WorkshopMapForm";
import { saveWorkshopLocation } from "../actions/workshop";

export const metadata: Metadata = { title: "نقشه کارگاه" };

export default async function AdminWorkshopPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !can(user, "settings")) return <Denied />;

  const { saved, error } = await searchParams;
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
      {error ? <p className="rounded-2xl bg-madder-50 px-5 py-3.5 text-sm font-bold text-madder-800 ring-1 ring-madder-700/20 ring-inset">{error === "provider" ? "سرویس نقشه معتبر نیست." : error === "map_key" ? "طول کلید Web Map معتبر نیست." : error}</p> : null}

      <WorkshopMapForm action={saveWorkshopLocation} serviceConfigured={Boolean(process.env.NESHAN_SERVICE_API_KEY)} workshop={{ lat: workshop?.lat ?? 37.5527, lng: workshop?.lng ?? 45.0761, address: workshop?.address ?? "", mapProvider: workshop?.mapProvider ?? "neshan", neshanWebMapKey: workshop?.neshanWebMapKey ?? process.env.NEXT_PUBLIC_NESHAN_MAP_KEY }} />
    </div>
  );
}
