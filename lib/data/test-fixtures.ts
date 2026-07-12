import type { HazardBulletin } from "@/features/shared/types";
import type { RawEvacCenter } from "@/lib/data/mock-evac-center";

const futureValidUntil = "2099-12-31T00:00:00.000Z";

export const additionHillsLocation = {
  barangayCode: "137401001",
  barangayName: "Addition Hills",
  cityMunicipality: "Mandaluyong",
  province: "Metro Manila",
  region: "NCR",
  lat: 14.5946,
  lng: 121.0391,
} as const;

export const activeTyphoonBulletin: HazardBulletin = {
  id: "test-bul-typhoon-001",
  source: "PAGASA",
  hazardType: "TYPHOON",
  issuedAt: "2026-07-12T04:00:00.000Z",
  validUntil: futureValidUntil,
  affectedAreas: [additionHillsLocation],
  severity: 4,
  rawText:
    "Tropical Cyclone Bulletin: Signal No. 3 raised over Metro Manila including Mandaluyong.",
};

export const activeFloodBulletin: HazardBulletin = {
  id: "test-bul-flood-002",
  source: "PAGASA",
  hazardType: "FLOOD",
  issuedAt: "2026-07-12T02:00:00.000Z",
  validUntil: futureValidUntil,
  affectedAreas: [additionHillsLocation],
  severity: 3,
  rawText:
    "Flood Advisory: Heavy rainfall may cause flooding in low-lying areas of Mandaluyong.",
};

export const additionHillsEvacCenter: RawEvacCenter = {
  id: "test-evac-001",
  name: "Addition Hills Elementary School",
  location: additionHillsLocation,
  lat: 14.5946,
  lng: 121.0391,
  status: "UNKNOWN",
  statusUpdatedAt: "2026-07-12T00:00:00.000Z",
  statusSource: "DEFAULT_UNKNOWN",
};
