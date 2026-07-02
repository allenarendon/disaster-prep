import type {
  EmergencyHotline,
  HotlineCategory,
  HotlinesResponse,
  LocationRef,
} from "@/features/shared/types";
import { getLocationByCode } from "@/lib/data/location-resolver";
import { getSeedEmergencyHotlines } from "@/lib/data/seed-loader";

const CATEGORY_ORDER: HotlineCategory[] = [
  "EMERGENCY",
  "POLICE",
  "FIRE",
  "DRRM",
  "BARANGAY",
  "MEDICAL",
  "OTHER",
];

function normalizeCity(text: string): string {
  return text.toLowerCase().trim().replace(/\s+city$/, "");
}

type SeedHotline = {
  category: HotlineCategory;
  label: string;
  number: string;
  notes?: string;
};

function withScope(
  contacts: SeedHotline[],
  scope: EmergencyHotline["scope"]
): EmergencyHotline[] {
  return contacts.map((contact) => ({ ...contact, scope }));
}

function sortHotlines(hotlines: EmergencyHotline[]): EmergencyHotline[] {
  return [...hotlines].sort((a, b) => {
    const categoryDiff =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (categoryDiff !== 0) return categoryDiff;
    return a.label.localeCompare(b.label);
  });
}

export function resolveHotlines(location: LocationRef): HotlinesResponse {
  const seed = getSeedEmergencyHotlines();
  const national = withScope(seed.national, "national");

  const cityMatch = seed.cities.find(
    (entry) =>
      normalizeCity(entry.cityMunicipality) ===
        normalizeCity(location.cityMunicipality) &&
      entry.province.toLowerCase() === location.province.toLowerCase()
  );
  const cityContacts = cityMatch
    ? withScope(cityMatch.contacts, "city")
    : [];

  const barangayMatch = seed.barangays.find(
    (entry) => entry.barangayCode === location.barangayCode
  );
  const barangayContacts = barangayMatch
    ? withScope(barangayMatch.contacts, "barangay")
    : [];

  const hotlines = sortHotlines([
    ...national,
    ...cityContacts,
    ...barangayContacts,
  ]);

  const hasBarangaySpecific = barangayContacts.length > 0;
  const hasCitySpecific = cityContacts.length > 0;

  let disclaimer =
    "Numbers are for reference only. Verify with your local LGU before an emergency.";
  if (!hasBarangaySpecific) {
    disclaimer +=
      " No barangay-specific hotline is on file for this location — contact your barangay hall directly or use the city/national numbers below.";
  } else if (!hasCitySpecific) {
    disclaimer +=
      " City-level hotlines are not on file — national and barangay numbers are shown below.";
  }

  return {
    location,
    hotlines,
    hasBarangaySpecific,
    hasCitySpecific,
    disclaimer,
  };
}

export function resolveHotlinesByBarangayCode(
  barangayCode: string
): HotlinesResponse | undefined {
  const location = getLocationByCode(barangayCode);
  if (!location) return undefined;
  return resolveHotlines(location);
}
