"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, MapPinned } from "lucide-react";
import "@neshan-maps-platform/mapbox-gl/dist/NeshanMapboxGl.css";

interface Props {
  lat: number;
  lng: number;
  mapKey?: string;
}

export function NeshanMap({ lat, lng, mapKey }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!mapKey || !containerRef.current) return;

    let disposed = false;
    let map: InstanceType<typeof import("@neshan-maps-platform/mapbox-gl")["Map"]> | null = null;

    void import("@neshan-maps-platform/mapbox-gl")
      .then((neshan) => {
        if (disposed || !containerRef.current) return;

        map = new neshan.Map({
          container: containerRef.current,
          mapKey,
          mapType: "neshanVector",
          center: [lng, lat],
          zoom: 16,
          pitch: 0,
          poi: true,
          traffic: false,
          attributionControl: false,
        });

        map.addControl(new neshan.NavigationControl({ showCompass: false }), "top-left");
        new neshan.Marker({ color: "#9d382c" })
          .setLngLat([lng, lat])
          .setPopup(new neshan.Popup({ offset: 24 }).setText("کارگاه اسدزاده"))
          .addTo(map);

        map.once("load", () => {
          if (!disposed) setStatus("ready");
        });
        map.once("error", () => {
          if (!disposed) setStatus("error");
        });
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [lat, lng, mapKey]);

  if (!mapKey) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center bg-sand-100 px-6 text-center">
        <MapPinned className="h-9 w-9 text-teal-600" />
        <p className="mt-3 font-black text-navy-900">نقشه نشان آماده اتصال است</p>
        <p className="mt-1 max-w-sm text-sm leading-7 text-ink-600">
          کلید Web SDK نشان را در
          <span dir="ltr" className="mx-1 font-mono text-xs">NEXT_PUBLIC_NESHAN_MAP_KEY</span>
          قرار دهید.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-80 bg-sand-100">
      <div ref={containerRef} className="absolute inset-0" aria-label="نقشه زنده کارگاه اسدزاده روی نشان" />
      {status === "loading" ? (
        <div className="absolute inset-0 grid place-items-center bg-sand-100/90">
          <div className="text-center">
            <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-teal-600/25 border-t-teal-600" />
            <p className="mt-3 text-sm font-bold text-ink-600">در حال دریافت نقشه نشان…</p>
          </div>
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-sand-100 px-6 text-center">
          <AlertCircle className="h-8 w-8 text-madder-700" />
          <p className="mt-2 font-black text-navy-900">نقشه بارگیری نشد</p>
          <p className="mt-1 text-sm text-ink-600">نشانی متنی و لینک مسیریابی همچنان در دسترس است.</p>
        </div>
      ) : null}
    </div>
  );
}
