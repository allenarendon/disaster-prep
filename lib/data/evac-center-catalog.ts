import {
  createMockEvacCenterForLocation,
  type RawEvacCenter,
} from "@/lib/data/mock-evac-center";
import {
  createFallbackSchoolAnchor,
  findNearestPublicSchoolForBarangay,
} from "@/lib/data/nearest-public-school";
import { getLocationByCode } from "@/lib/data/location-resolver";
import { getSeedEvacCenters } from "@/lib/data/seed-loader";
import { isPhilippinesCoordinate } from "@/lib/data/geo";
import type { LocationRef } from "@/features/shared/types";

let verifiedBarangayCodes: Set<string> | undefined;

function getVerifiedBarangayCodes(): Set<string> {
  if (!verifiedBarangayCodes) {
    verifiedBarangayCodes = new Set(
      getSeedEvacCenters().map((center) => center.location.barangayCode)
    );
  }
  return verifiedBarangayCodes;
}

export function hasVerifiedEvacCenter(barangayCode: string): boolean {
  return getVerifiedBarangayCodes().has(barangayCode);
}

export function getVerifiedEvacCentersForBarangay(
  barangayCode: string
): RawEvacCenter[] {
  return getSeedEvacCenters().filter(
    (center) => center.location.barangayCode === barangayCode
  );
}

export function getEvacCentersForBarangay(
  barangayCode: string,
  locationHint?: LocationRef
): RawEvacCenter[] {
  const verified = getVerifiedEvacCentersForBarangay(barangayCode);
  if (verified.length > 0) {
    return verified;
  }

  const location = locationHint ?? getLocationByCode(barangayCode);
  if (!location) {
    return [];
  }

  const hallLat = location.lat;
  const hallLng = location.lng;
  const school =
    isPhilippinesCoordinate(hallLat, hallLng)
      ? createFallbackSchoolAnchor(location, hallLat as number, hallLng as number)
      : undefined;

  return [createMockEvacCenterForLocation(location, school)];
}

export async function getEvacCentersForBarangayAsync(
  barangayCode: string,
  locationHint?: LocationRef
): Promise<RawEvacCenter[]> {
  const verified = getVerifiedEvacCentersForBarangay(barangayCode);
  if (verified.length > 0) {
    return verified;
  }

  const location = locationHint ?? getLocationByCode(barangayCode);
  if (!location) {
    return [];
  }

  const hallLat = location.lat;
  const hallLng = location.lng;
  let school = await findNearestPublicSchoolForBarangay(location);

  if (!school && isPhilippinesCoordinate(hallLat, hallLng)) {
    school = createFallbackSchoolAnchor(location, hallLat as number, hallLng as number);
  }

  return [createMockEvacCenterForLocation(location, school)];
}

export { MOCK_EVAC_CENTER_MESSAGE } from "@/lib/data/mock-evac-center";
