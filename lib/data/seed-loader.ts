import fs from "fs";
import path from "path";
import type { HazardBulletin } from "@/features/shared/types";
import type { LocationRef } from "@/features/shared/types";
import type { OfflineBundle } from "@/features/shared/types";

type RawEvacCenter = {
  id: string;
  name: string;
  location: LocationRef;
  lat: number;
  lng: number;
  capacity?: number;
  status: "OPEN" | "FULL" | "CLOSED" | "UNKNOWN";
  statusUpdatedAt: string;
  statusSource: "LGU_ADMIN" | "COMMUNITY_REPORT" | "DEFAULT_UNKNOWN";
};

function seedPath(filename: string): string {
  return path.join(process.cwd(), "data", "seed", filename);
}

export function loadSeedJson<T>(filename: string): T {
  const raw = fs.readFileSync(seedPath(filename), "utf-8");
  return JSON.parse(raw) as T;
}

export function getSeedLocations(): LocationRef[] {
  return loadSeedJson<LocationRef[]>("locations.json");
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
