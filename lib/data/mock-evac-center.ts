import type { LocationRef } from "@/features/shared/types";
import {
  isPhilippinesCoordinate,
  PHILIPPINES_DEFAULT_CENTER,
} from "@/lib/data/geo";

export type RawEvacCenter = {
  id: string;
  name: string;
  location: LocationRef;
  lat: number;
  lng: number;
  capacity?: number;
  status: "OPEN" | "FULL" | "CLOSED" | "UNKNOWN";
  statusUpdatedAt: string;
  statusSource: "LGU_ADMIN" | "COMMUNITY_REPORT" | "DEFAULT_UNKNOWN";
  isMock?: boolean;
};

const MOCK_STATUS_UPDATED_AT = "2026-07-01T00:00:00.000Z";

export const MOCK_EVAC_CENTER_MESSAGE =
  "Showing placeholder evacuation center data using the nearest mapped public school from OpenStreetMap. Contact your barangay or city DRRM office to confirm the official evacuation site.";

export type MockSchoolAnchor = {
  name: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  source?: "osm" | "fallback";
};

export function createMockEvacCenterForLocation(
  location: LocationRef,
  school?: MockSchoolAnchor
): RawEvacCenter {
  const hallCoords = isPhilippinesCoordinate(location.lat, location.lng)
    ? { lat: location.lat as number, lng: location.lng as number }
    : { ...PHILIPPINES_DEFAULT_CENTER };

  const evacCoords = school
    ? { lat: school.lat, lng: school.lng }
    : hallCoords;
  const schoolName = school?.name ?? `${location.barangayName} Public School`;

  return {
    id: mockEvacCenterId(location.barangayCode),
    name: `${schoolName} (Mock)`,
    location,
    lat: evacCoords.lat,
    lng: evacCoords.lng,
    status: "UNKNOWN",
    statusUpdatedAt: MOCK_STATUS_UPDATED_AT,
    statusSource: "DEFAULT_UNKNOWN",
    isMock: true,
  };
}

export function mockEvacCenterId(barangayCode: string): string {
  return `mock-evac-${barangayCode}`;
}

export function isMockEvacCenterId(id: string): boolean {
  return id.startsWith("mock-evac-");
}
