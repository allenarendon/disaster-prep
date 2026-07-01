"use client";

import { useEffect, useRef } from "react";
import type { EvacuationCenter } from "@/features/shared/types";
import "maplibre-gl/dist/maplibre-gl.css";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#16a34a",
  FULL: "#d97706",
  CLOSED: "#dc2626",
  UNKNOWN: "#64748b",
};

export function EvacMap({
  centers,
  userLat,
  userLng,
}: {
  centers: EvacuationCenter[];
  userLat?: number;
  userLng?: number;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || centers.length === 0) return;

    let cancelled = false;

    const initMap = async () => {
      const maplibregl = (await import("maplibre-gl")).default;

      if (cancelled || !mapContainer.current) return;

      const centerLat =
        userLat ?? centers.reduce((s, c) => s + c.lat, 0) / centers.length;
      const centerLng =
        userLng ?? centers.reduce((s, c) => s + c.lng, 0) / centers.length;

      if (mapRef.current) {
        mapRef.current.remove();
      }

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [
                "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
            },
          ],
        },
        center: [centerLng, centerLat],
        zoom: 13,
      });

      mapRef.current = map;

      centers.forEach((center) => {
        const el = document.createElement("div");
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor =
          STATUS_COLORS[center.status] ?? STATUS_COLORS.UNKNOWN;
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";

        new maplibregl.Marker({ element: el })
          .setLngLat([center.lng, center.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(
              `<strong>${center.name}</strong><br/>Status: ${center.status}`
            )
          )
          .addTo(map);
      });
    };

    void initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [centers, userLat, userLng]);

  return (
    <div
      ref={mapContainer}
      className="h-64 w-full overflow-hidden rounded-lg border border-slate-200"
    />
  );
}
