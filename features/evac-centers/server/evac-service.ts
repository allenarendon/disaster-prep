import type { EvacuationCenter, LocationRef } from "@/features/shared/types";
import { getDataStore } from "@/lib/data";
import {
  getEvacCentersForBarangayAsync,
  hasVerifiedEvacCenter,
  MOCK_EVAC_CENTER_MESSAGE,
} from "@/lib/data/evac-center-catalog";
import { getLocationByCode } from "@/lib/data/location-resolver";
import { haversineKm, isPhilippinesCoordinate, RADIUS_STEPS_KM } from "@/lib/data/geo";
import { resolveAllEvacCenters } from "@/features/evac-centers/server/status-resolver";
import type { RawEvacCenter } from "@/lib/data/mock-evac-center";

function withReportCount(centers: RawEvacCenter[]): EvacuationCenter[] {
  return centers.map((center) => ({ ...center, reportCount: 0 }));
}

export function alignCentersToSelectedBarangay(
  barangayCode: string,
  centers: EvacuationCenter[],
  locationHint?: LocationRef
): EvacuationCenter[] {
  const canonical = locationHint ?? getLocationByCode(barangayCode);
  if (!canonical) return centers;

  return centers.map((center) => ({
    ...center,
    location: {
      barangayCode: canonical.barangayCode,
      barangayName: canonical.barangayName,
      cityMunicipality: canonical.cityMunicipality,
      province: canonical.province,
      region: canonical.region,
      lat: isPhilippinesCoordinate(canonical.lat, canonical.lng)
        ? canonical.lat
        : isPhilippinesCoordinate(center.lat, center.lng)
          ? center.lat
          : canonical.lat,
      lng: isPhilippinesCoordinate(canonical.lat, canonical.lng)
        ? canonical.lng
        : isPhilippinesCoordinate(center.lat, center.lng)
          ? center.lng
          : canonical.lng,
    },
  }));
}

export interface EvacSearchResult {
  centers: Awaited<ReturnType<typeof resolveAllEvacCenters>>;
  searchedRadiusKm: number;
  expanded: boolean;
  locationHasKnownCenter: boolean;
  message?: string;
  resolvedLocation?: LocationRef;
}

export async function searchEvacCenters(params: {
  lat?: number;
  lng?: number;
  barangayCode?: string;
  locationBarangayCode?: string;
  radiusKm?: number;
}): Promise<EvacSearchResult> {
  const store = getDataStore();
  const allCenters = await store.getAllEvacCenters();

  if (params.barangayCode) {
    const locationHint = getLocationByCode(params.barangayCode);
    const filtered = await getEvacCentersForBarangayAsync(
      params.barangayCode,
      locationHint
    );
    const activeBulletins = params.barangayCode
      ? await store.getActiveBulletinsForLocation({
          barangayCode: params.barangayCode,
          barangayName:
            locationHint?.barangayName ??
            filtered[0]?.location.barangayName ??
            "",
          cityMunicipality:
            locationHint?.cityMunicipality ??
            filtered[0]?.location.cityMunicipality ??
            "",
          province:
            locationHint?.province ?? filtered[0]?.location.province ?? "",
          region: locationHint?.region ?? filtered[0]?.location.region ?? "",
        })
      : [];

    const resolved = alignCentersToSelectedBarangay(
      params.barangayCode,
      await resolveAllEvacCenters(
        withReportCount(filtered),
        store,
        activeBulletins
      ),
      locationHint
    );
    const usesMockOnly =
      filtered.length > 0 && filtered.every((center) => center.isMock);

    return {
      centers: resolved,
      searchedRadiusKm: 0,
      expanded: false,
      locationHasKnownCenter: hasVerifiedEvacCenter(params.barangayCode),
      message: usesMockOnly ? MOCK_EVAC_CENTER_MESSAGE : undefined,
      resolvedLocation: locationHint,
    };
  }

  const lat = params.lat!;
  const lng = params.lng!;
  const locationHasKnownCenter = params.locationBarangayCode
    ? hasVerifiedEvacCenter(params.locationBarangayCode)
    : false;
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

      const shouldUseMockForBarangay =
        !locationHasKnownCenter && Boolean(params.locationBarangayCode);
      const mockCenters = shouldUseMockForBarangay
        ? withReportCount(
            await getEvacCentersForBarangayAsync(
              params.locationBarangayCode!,
              getLocationByCode(params.locationBarangayCode!)
            )
          ).map((center) => ({
            ...center,
            distanceKm: haversineKm(lat, lng, center.lat, center.lng),
          }))
        : [];
      const visibleCenters = shouldUseMockForBarangay
        ? mockCenters
        : withDistance;
      const resolved = shouldUseMockForBarangay
        ? alignCentersToSelectedBarangay(
            params.locationBarangayCode!,
            await resolveAllEvacCenters(
              visibleCenters,
              store,
              activeBulletins
            ),
            getLocationByCode(params.locationBarangayCode!)
          )
        : await resolveAllEvacCenters(
            visibleCenters,
            store,
            activeBulletins
          );

      const message = shouldUseMockForBarangay
        ? MOCK_EVAC_CENTER_MESSAGE
        : withDistance.length === 0
          ? `No evacuation centers found within ${lastRadius}km. Contact your barangay DRRM office for assistance.`
          : !locationHasKnownCenter
            ? `No known evacuation center is currently listed for this barangay. Showing nearest known centers within ${lastRadius}km. Contact your barangay or city DRRM office for official evacuation instructions.`
            : expanded
              ? `No centers within 5km. Showing results within ${lastRadius}km.`
              : undefined;

      return {
        centers: resolved,
        searchedRadiusKm: lastRadius,
        expanded,
        locationHasKnownCenter,
        message,
      };
    }
  }

  return {
    centers: [],
    searchedRadiusKm: lastRadius,
    expanded: true,
    locationHasKnownCenter,
    message: `No evacuation centers found within ${lastRadius}km. Contact your barangay DRRM office for assistance.`,
  };
}
