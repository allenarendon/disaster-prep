import type { LocationRef, LocationSearchMatch } from "@/features/shared/types";
import { normalizeLocationCoordinates } from "@/lib/data/barangay-coordinates";
import { hasVerifiedEvacCenter } from "@/lib/data/evac-center-catalog";
import { getSeedLocations } from "@/lib/data/seed-loader";
import { haversineKm, isPhilippinesCoordinate } from "@/lib/data/geo";

const locations = getSeedLocations();

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function scoreMatch(query: string, location: LocationRef): number {
  const q = normalize(query);
  const fields = [
    location.barangayName,
    location.cityMunicipality,
    location.province,
    `${location.barangayName} ${location.cityMunicipality}`,
  ].map(normalize);

  let best = 0;
  for (const field of fields) {
    if (field === q) return 100;
    if (field.startsWith(q)) best = Math.max(best, 80);
    if (field.includes(q)) best = Math.max(best, 60);
    const qParts = q.split(" ");
    const matchedParts = qParts.filter((p) => field.includes(p)).length;
    if (matchedParts > 0) {
      best = Math.max(best, (matchedParts / qParts.length) * 50);
    }
  }
  return best;
}

export function getLocationByCode(barangayCode: string): LocationRef | undefined {
  const location = locations.find((l) => l.barangayCode === barangayCode);
  return location ? normalizeLocationCoordinates(location) : undefined;
}

export function getAllLocations(): LocationRef[] {
  return locations;
}

export function hasKnownEvacCenter(barangayCode: string): boolean {
  return hasVerifiedEvacCenter(barangayCode);
}

function getSearchHaystack(location: LocationRef): string {
  return normalize(
    `${location.barangayName} ${location.cityMunicipality} ${location.province} ${location.region}`
  );
}

function isCandidate(query: string, location: LocationRef): boolean {
  const haystack = getSearchHaystack(location);
  if (haystack.includes(query)) return true;

  const parts = query.split(" ").filter(Boolean);
  return parts.length > 0 && parts.every((part) => haystack.includes(part));
}

export const LOCATION_SEARCH_DEFAULT_LIMIT = 20;
export const LOCATION_SEARCH_MAX_LIMIT = 20;

export function searchLocations(
  query: string,
  limit = LOCATION_SEARCH_DEFAULT_LIMIT
): LocationRef[] {
  return searchLocationsWithCoverage(query, limit).map((item) => item.location);
}

export function searchLocationsWithCoverage(
  query: string,
  limit = LOCATION_SEARCH_DEFAULT_LIMIT
): Array<{ location: LocationRef; knownEvacCenter: boolean }> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const q = normalize(trimmed);
  const candidates = locations.filter((location) => isCandidate(q, location));

  return candidates
    .map((location) => {
      const knownEvacCenter = hasKnownEvacCenter(location.barangayCode);
      const score = scoreMatch(trimmed, location) + (knownEvacCenter ? 15 : 0);
      return { location, score, knownEvacCenter };
    })
    .filter((item) => item.score >= 40)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.knownEvacCenter !== b.knownEvacCenter) {
        return a.knownEvacCenter ? -1 : 1;
      }
      return a.location.barangayName.localeCompare(b.location.barangayName);
    })
    .slice(0, limit)
    .map((item) => ({
      location: normalizeLocationCoordinates(item.location),
      knownEvacCenter: item.knownEvacCenter,
    }));
}

export function resolveLocation(
  input: Partial<LocationRef> & { query?: string }
): { resolved?: LocationRef; suggestions: LocationRef[] } {
  if (input.barangayCode) {
    const byCode = getLocationByCode(input.barangayCode);
    if (byCode) return { resolved: byCode, suggestions: [] };
  }

  if (input.barangayName && input.cityMunicipality) {
    const exact = locations.find(
      (l) =>
        normalize(l.barangayName) === normalize(input.barangayName!) &&
        normalize(l.cityMunicipality) === normalize(input.cityMunicipality!)
    );
    if (exact) return { resolved: exact, suggestions: [] };
  }

  const query =
    input.query ??
    [input.barangayName, input.cityMunicipality].filter(Boolean).join(" ");
  const suggestions = searchLocations(query);

  if (suggestions.length === 1) {
    return { resolved: suggestions[0], suggestions: [] };
  }

  return { resolved: undefined, suggestions };
}

export function toLocationSearchMatches(
  items: Array<{ location: LocationRef; knownEvacCenter: boolean }>
): LocationSearchMatch[] {
  return items.map((item) => ({
    ...item.location,
    knownEvacCenter: item.knownEvacCenter,
  }));
}

export function locationMatchesArea(
  location: LocationRef,
  area: LocationRef
): boolean {
  if (area.barangayCode && location.barangayCode === area.barangayCode) {
    return true;
  }
  if (
    area.barangayName &&
    normalize(location.barangayName) === normalize(area.barangayName) &&
    normalize(location.cityMunicipality) === normalize(area.cityMunicipality)
  ) {
    return true;
  }
  if (
    area.province &&
    normalize(location.province) === normalize(area.province) &&
    !area.barangayCode &&
    !area.barangayName
  ) {
    return true;
  }
  if (
    area.region &&
    normalize(location.region) === normalize(area.region) &&
    !area.province &&
    !area.barangayCode
  ) {
    return true;
  }
  return false;
}

export function findNearestLocation(
  lat: number,
  lng: number
): { location?: LocationRef; distanceKm: number } {
  let nearest: LocationRef | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const location of locations) {
    if (!isPhilippinesCoordinate(location.lat, location.lng)) continue;
    const distance = haversineKm(
      lat,
      lng,
      location.lat as number,
      location.lng as number
    );
    if (distance < nearestDistance) {
      nearest = location;
      nearestDistance = distance;
    }
  }

  if (!nearest) {
    return { location: undefined, distanceKm: Number.POSITIVE_INFINITY };
  }

  return {
    location: normalizeLocationCoordinates(nearest),
    distanceKm: nearestDistance,
  };
}
