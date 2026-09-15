"use client";

import { useEffect, useRef, useState } from "react";

interface OpenStreetMapPickerProps {
  lat: number;
  lng: number;
  latInputName: string;
  lngInputName: string;
}

export function OpenStreetMapPicker({ lat, lng, latInputName, lngInputName }: OpenStreetMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof import("leaflet").map> | null>(null);
  const markerRef = useRef<ReturnType<typeof import("leaflet").marker> | null>(null);
  const initializedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    let disposed = false;
    const initLat = lat;
    const initLng = lng;

    async function init() {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (disposed || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [initLat, initLng],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);

      const syncInputs = () => {
        const pos = marker.getLatLng();
        const form = containerRef.current?.closest("form");
        const latInput = form?.querySelector(`[name="${latInputName}"]`) as HTMLInputElement | null;
        const lngInput = form?.querySelector(`[name="${lngInputName}"]`) as HTMLInputElement | null;
        if (latInput) latInput.value = String(pos.lat);
        if (lngInput) lngInput.value = String(pos.lng);
      };

      marker.on("dragend", syncInputs);
      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        syncInputs();
      });

      mapRef.current = map;
      markerRef.current = marker;
      initializedRef.current = true;
      setReady(true);
    }

    void init();

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        initializedRef.current = false;
        setReady(false);
      }
    };
    // We intentionally omit lat/lng from deps to avoid re-creating the map on every prop change.
    // Position updates are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latInputName, lngInputName]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const current = markerRef.current.getLatLng();
    if (Math.abs(current.lat - lat) > 0.0001 || Math.abs(current.lng - lng) > 0.0001) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    }
  }, [lat, lng]);

  return (
    <div className="relative overflow-hidden rounded-2xl ring-1 ring-ink-900/10">
      <div ref={containerRef} className="h-80 w-full" aria-label="نقشه OpenStreetMap" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-sand-100">
          <div className="text-center">
            <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-teal-600/25 border-t-teal-600" />
            <p className="mt-3 text-sm font-bold text-ink-600">در حال بارگیری نقشه…</p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-bold text-ink-600 shadow-sm">
        برای تنظیم موقعیت روی نقشه کلیک کنید یا نشان را بکشید
      </div>
    </div>
  );
}
