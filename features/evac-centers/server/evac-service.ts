import type { LocationRef } from "@/features/shared/types";
import { getDataStore } from "@/lib/data";
import { haversineKm, RADIUS_STEPS_KM } from "@/lib/data/geo";
import { resolveAllEvacCenters } from "@/features/evac-centers/server/status-resolver";

export interface EvacSearchResult {
  centers: Awaited<ReturnType<typeof resolveAllEvacCenters>>;
  searchedRadiusKm: number;
  expanded: boolean;
  message?: string;
}

export async function searchEvacCenters(params: {
  lat?: number;
  lng?: number;
  barangayCode?: string;
  radiusKm?: number;
}): Promise<EvacSearchResult> {
  const store = getDataStore();
  const allCenters = await store.getAllEvacCenters();

  if (params.barangayCode) {
    const filtered = allCenters.filter(
      (c) => c.location.barangayCode === params.barangayCode
    );
    const activeBulletins = params.barangayCode
      ? await store.getActiveBulletinsForLocation({
          barangayCode: params.barangayCode,
          barangayName: filtered[0]?.location.barangayName ?? "",
          cityMunicipality: filtered[0]?.location.cityMunicipality ?? "",
          province: filtered[0]?.location.province ?? "",
          region: filtered[0]?.location.region ?? "",
        })
      : [];

    const resolved = await resolveAllEvacCenters(
      filtered,
      store,
      activeBulletins
    );
    return {
      centers: resolved,
      searchedRadiusKm: 0,
      expanded: false,
    };
  }

  const lat = params.lat!;
  const lng = params.lng!;
  const requestedRadius = params.radiusKm;

  const radii = requestedRadius
    ? [requestedRadius]
    : [...RADIUS_STEPS_KM];

  let lastRadius = radii[radii.length - 1];
  let expanded = false;

  for (let i = 0; i < radii.length; i++) {
    const radius = radii[i];
    lastRadius = radius;

    const withDistance = allCenters
      .map((center) => ({
        ...center,
        distanceKm: haversineKm(lat, lng, center.lat, center.lng),
      }))
      .filter((c) => c.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (withDistance.length > 0 || i === radii.length - 1) {
      expanded = i > 0 && !requestedRadius;

      const location: LocationRef = {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "",
        region: "",
        lat,
        lng,
      };

      const activeBulletins = await store.getActiveBulletinsForLocation(
        location
      );

      const resolved = await resolveAllEvacCenters(
        withDistance,
        store,
        activeBulletins
      );

      const message =
        withDistance.length === 0
          ? `No evacuation centers found within ${lastRadius}km. Contact your barangay DRRM office for assistance.`
          : expanded
            ? `No centers within 5km. Showing results within ${lastRadius}km.`
            : undefined;

      return {
        centers: resolved,
        searchedRadiusKm: lastRadius,
        expanded,
        message,
      };
    }
  }

  return {
    centers: [],
    searchedRadiusKm: lastRadius,
    expanded: true,
    message: `No evacuation centers found within ${lastRadius}km. Contact your barangay DRRM office for assistance.`,
  };
}
