import fs from "fs";
import path from "path";
import type { HazardBulletin } from "@/features/shared/types";
import type { LocationRef } from "@/features/shared/types";
import type { HotlineCategory, OfflineBundle } from "@/features/shared/types";

import type { RawEvacCenter } from "@/lib/data/mock-evac-center";

export type { RawEvacCenter };

function seedPath(filename: string): string {
  return path.join(process.cwd(), "data", "seed", filename);
}

function psgcPath(filename: string): string {
  return path.join(process.cwd(), "data", "psgc", filename);
}

export function loadSeedJson<T>(filename: string): T {
  const raw = fs.readFileSync(seedPath(filename), "utf-8");
  return JSON.parse(raw) as T;
}

export function getSeedLocations(): LocationRef[] {
  const raw = fs.readFileSync(psgcPath("locations.json"), "utf-8");
  return JSON.parse(raw) as LocationRef[];
}

export function getSeedBulletins(): HazardBulletin[] {
  return loadSeedJson<HazardBulletin[]>("bulletins.json");
}

export function getSeedEvacCenters(): RawEvacCenter[] {
  return loadSeedJson<RawEvacCenter[]>("evac-centers.json");
}

export function getSeedOfflineBundle(): OfflineBundle {
  return loadSeedJson<OfflineBundle>("offline-bundle.json");
}

type SeedHotlineEntry = {
  category: HotlineCategory;
  label: string;
  number: string;
  notes?: string;
};

type SeedEmergencyHotlines = {
  national: SeedHotlineEntry[];
  cities: Array<{
    cityMunicipality: string;
    province: string;
    contacts: SeedHotlineEntry[];
  }>;
  barangays: Array<{
    barangayCode: string;
    contacts: SeedHotlineEntry[];
  }>;
};

export function getSeedEmergencyHotlines(): SeedEmergencyHotlines {
  return loadSeedJson<SeedEmergencyHotlines>("emergency-hotlines.json");
}
