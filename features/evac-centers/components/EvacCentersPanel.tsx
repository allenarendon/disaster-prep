"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { EvacuationCenter, LocationRef } from "@/features/shared/types";
import {
  createMockEvacCenterForLocation,
  MOCK_EVAC_CENTER_MESSAGE,
} from "@/lib/data/mock-evac-center";
import { resolveMapCenter } from "@/lib/data/geo";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import { LoadingSkeleton } from "@/features/shared/components/LoadingSkeleton";
import { ErrorState } from "@/features/shared/components/ErrorState";

const EvacMap = dynamic(
  () =>
    import("@/features/evac-centers/components/EvacMap").then((m) => m.EvacMap),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg bg-ph-blue/10" /> }
);

interface EvacSearchResponse {
  centers: EvacuationCenter[];
  searchedRadiusKm: number;
  expanded: boolean;
  locationHasKnownCenter: boolean;
  message?: string;
  resolvedLocation?: LocationRef;
}

export function EvacCentersPanel({
  location,
  isOnline,
  offlineCenters,
}: {
  location: LocationRef;
  isOnline: boolean;
  offlineCenters?: EvacuationCenter[];
}) {
  const [data, setData] = useState<EvacSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline && offlineCenters) {
      let filteredOfflineCenters = offlineCenters.filter(
        (center) => center.location.barangayCode === location.barangayCode
      );
      if (filteredOfflineCenters.length === 0) {
        filteredOfflineCenters = [
          { ...createMockEvacCenterForLocation(location), reportCount: 0 },
        ];
      }
      const usesMockOnly = filteredOfflineCenters.every((center) => center.isMock);
      setData({
        centers: filteredOfflineCenters,
        searchedRadiusKm: 0,
        expanded: false,
        locationHasKnownCenter: !usesMockOnly,
        message: usesMockOnly
          ? `${MOCK_EVAC_CENTER_MESSAGE} Showing cached map data (may be outdated).`
          : "Showing cached evacuation centers for your selected barangay (may be outdated).",
      });
      setLoading(false);
      return;
    }

    if (!isOnline) {
      setError("No cached evacuation data. Connect to download.");
      setLoading(false);
      return;
    }

    const fetchCenters = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = `barangayCode=${encodeURIComponent(location.barangayCode)}`;

        const res = await fetch(`/api/evac-centers?${params}`);
        if (!res.ok) throw new Error("Failed");
        const result = await res.json();
        setData(result);
      } catch {
        setError(
          "Could not load evacuation centers. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchCenters();
  }, [location, isOnline, offlineCenters]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState title="Evacuation centers" message={error} />;

  const centers = data?.centers ?? [];
  const mapLocation = data?.resolvedLocation ?? location;
  const mapCenter = resolveMapCenter(mapLocation, centers);
  const barangayLabel = `${location.barangayName}, ${location.cityMunicipality}`;

  return (
    <div className="space-y-4">
      {data?.message && (
        <p className="text-sm text-ph-gold-dark">{data.message}</p>
      )}

      <EvacMap
        centers={centers}
        mapCenterLat={mapCenter.lat}
        mapCenterLng={mapCenter.lng}
        barangayLabel={barangayLabel}
      />
      <p className="text-xs text-slate-500">
        Selected barangay: {barangayLabel}
      </p>

      <ul className="space-y-3">
        {centers.map((center) => (
          <li
            key={center.id}
            className="rounded-lg border border-ph-blue/20 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-slate-900">{center.name}</h4>
                <p className="text-sm text-slate-500">{barangayLabel}</p>
              </div>
              <StatusBadge status={center.status} />
            </div>
            {center.isMock && (
              <p className="mt-2 text-xs font-medium text-ph-gold-dark">
                Mock placeholder — nearest mapped public school, not verified by LGU
              </p>
            )}
            {center.distanceKm !== undefined && (
              <p className="mt-1 text-xs text-slate-500">
                {center.distanceKm.toFixed(1)} km away
              </p>
            )}
            {center.isStale && (
              <p className="mt-1 text-xs text-ph-gold-dark">
                Last confirmed over 24 hours ago — may be outdated.
              </p>
            )}
            {center.conflictNote && (
              <p className="mt-1 text-xs text-ph-gold-dark">{center.conflictNote}</p>
            )}
            {center.reportCount > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {center.reportCount} corroborating report
                {center.reportCount > 1 ? "s" : ""} in last 6 hours
              </p>
            )}
          </li>
        ))}
      </ul>

      {centers.length === 0 && (
        <p className="text-sm text-slate-600">
          No evacuation centers found nearby. Contact your barangay DRRM office.
        </p>
      )}
    </div>
  );
}
