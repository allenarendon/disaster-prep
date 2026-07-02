"use client";

import { useEffect, useRef } from "react";
import type { EvacuationCenter } from "@/features/shared/types";
import { isPhilippinesCoordinate } from "@/lib/data/geo";
import "maplibre-gl/dist/maplibre-gl.css";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#0038A8",
  FULL: "#FCD116",
  CLOSED: "#CE1126",
  UNKNOWN: "#64748b",
};

export function EvacMap({
  centers,
  mapCenterLat,
  mapCenterLng,
  barangayLabel,
}: {
  centers: EvacuationCenter[];
  mapCenterLat?: number;
  mapCenterLng?: number;
  barangayLabel?: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    let cancelled = false;

    const initMap = async () => {
      const maplibregl = (await import("maplibre-gl")).default;

      if (cancelled || !mapContainer.current) return;

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
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
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
        center: [mapCenterLng ?? 121.774, mapCenterLat ?? 12.8797],
        zoom: 13,
      });

      mapRef.current = map;

      map.on("load", () => {
        const bounds = new maplibregl.LngLatBounds();

        if (isPhilippinesCoordinate(mapCenterLat, mapCenterLng)) {
          const centerLat = mapCenterLat as number;
          const centerLng = mapCenterLng as number;
          const barangayEl = document.createElement("div");
          barangayEl.style.width = "12px";
          barangayEl.style.height = "12px";
          barangayEl.style.borderRadius = "50%";
          barangayEl.style.backgroundColor = "#111827";
          barangayEl.style.border = "2px solid white";
          barangayEl.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";

          new maplibregl.Marker({ element: barangayEl })
            .setLngLat([centerLng, centerLat])
            .setPopup(
              new maplibregl.Popup({ offset: 12 }).setText(
                barangayLabel
                  ? `Selected barangay: ${barangayLabel}`
                  : "Selected barangay"
              )
            )
            .addTo(map);

          bounds.extend([centerLng, centerLat]);
        }

        centers.forEach((center) => {
          if (!isPhilippinesCoordinate(center.lat, center.lng)) return;

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

          bounds.extend([center.lng, center.lat]);
        });

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 48, maxZoom: 14 });
        }
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
  }, [centers, mapCenterLat, mapCenterLng, barangayLabel]);

  return (
    <div
      ref={mapContainer}
      className="h-64 w-full overflow-hidden rounded-lg border border-ph-blue/20"
    />
  );
}
