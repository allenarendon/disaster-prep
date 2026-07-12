import {
  createMockEvacCenterForLocation,
  type RawEvacCenter,
} from "@/lib/data/mock-evac-center";
import {
  createFallbackSchoolAnchor,
  findNearestPublicSchoolForBarangay,
} from "@/lib/data/nearest-public-school";
import { getLocationByCode } from "@/lib/data/location-resolver";
import { isPhilippinesCoordinate } from "@/lib/data/geo";
import type { LocationRef } from "@/features/shared/types";

export function hasVerifiedEvacCenter(_barangayCode: string): boolean {
  return false;
}

export function getVerifiedEvacCentersForBarangay(
  _barangayCode: string
): RawEvacCenter[] {
  return [];
}

export function getEvacCentersForBarangay(
  barangayCode: string,
  locationHint?: LocationRef
): RawEvacCenter[] {
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
