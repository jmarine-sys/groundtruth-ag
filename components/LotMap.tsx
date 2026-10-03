"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { DEMO_LOT, ZONES } from "@/lib/zones";

// Mapa del lote registrado y de su celda de ~20 km. Solo visualización: la posición es
// fija (se cargó al crear la cuenta). Se usan círculos en vez de íconos de Leaflet para
// no depender de las imágenes del paquete.
export function LotMap() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;

    import("leaflet").then((L) => {
      if (disposed || !ref.current) return;
      const zone = ZONES[DEMO_LOT.zone];
      const cell = L.latLngBounds(
        [zone.lat - zone.halfLat, zone.lon - zone.halfLon],
        [zone.lat + zone.halfLat, zone.lon + zone.halfLon],
      );

      // En pantallas táctiles el mapa no se arrastra con un dedo: así el scroll de la página no queda atrapado.
      map = L.map(ref.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile }).fitBounds(cell.pad(0.15));
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      L.rectangle(cell, { color: "#15803d", weight: 2, fillOpacity: 0.06 })
        .bindTooltip(`Index grid cell · ${zone.name} · ~20 × 20 km`)
        .addTo(map);
      L.circleMarker([zone.lat, zone.lon], { radius: 5, color: "#1c2a1f", fillOpacity: 0.9 })
        .bindTooltip("Weather data point (cell center)")
        .addTo(map);
      L.circleMarker([DEMO_LOT.lat, DEMO_LOT.lon], { radius: 9, color: "#b7802f", fillOpacity: 0.85 })
        .bindTooltip(DEMO_LOT.label, { permanent: true, direction: "top" })
        .addTo(map);
    });

    return () => {
      disposed = true;
      map?.remove();
    };
  }, []);

  return (
    <div>
      <div ref={ref} role="img" aria-label="Map of your registered lot inside its 20 km index grid cell near Pergamino" className="h-64 w-full rounded-xl border border-black/10 lg:h-[26rem]" />
      <p className="mt-2 text-xs text-neutral-600">
        Your lot was registered when your account was created. Your report is compared with the index for the
        green ~20 km grid cell it falls in.{" "}
        <span className="inline-block h-2 w-2 rounded-full bg-soil-500" /> your lot ·{" "}
        <span className="inline-block h-2 w-2 rounded-full bg-[#1c2a1f]" /> weather data point
      </p>
    </div>
  );
}
