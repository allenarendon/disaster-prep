"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { EvacuationCenter, LocationRef } from "@/features/shared/types";
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
  message?: string;
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
      setData({
        centers: offlineCenters,
        searchedRadiusKm: 0,
        expanded: false,
        message: "Showing cached evacuation centers (may be outdated).",
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
        const params = location.lat && location.lng
          ? `lat=${location.lat}&lng=${location.lng}`
          : `barangayCode=${location.barangayCode}`;

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

  return (
    <div className="space-y-4">
      {data?.message && (
        <p className="text-sm text-ph-gold-dark">{data.message}</p>
      )}

      {centers.length > 0 && (
        <EvacMap centers={centers} userLat={location.lat} userLng={location.lng} />
      )}

      <ul className="space-y-3">
        {centers.map((center) => (
          <li
            key={center.id}
            className="rounded-lg border border-ph-blue/20 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-slate-900">{center.name}</h4>
                <p className="text-sm text-slate-500">
                  {center.location.barangayName},{" "}
                  {center.location.cityMunicipality}
                </p>
              </div>
              <StatusBadge status={center.status} />
            </div>
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
