import type { LocationRef } from "@/features/shared/types";
import { getSeedLocations } from "@/lib/data/seed-loader";

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
  return locations.find((l) => l.barangayCode === barangayCode);
}

export function getAllLocations(): LocationRef[] {
  return locations;
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

export function searchLocations(query: string, limit = 5): LocationRef[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const q = normalize(trimmed);
  const candidates = locations.filter((location) => isCandidate(q, location));

  return candidates
    .map((location) => ({ location, score: scoreMatch(trimmed, location) }))
    .filter((item) => item.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.location);
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
