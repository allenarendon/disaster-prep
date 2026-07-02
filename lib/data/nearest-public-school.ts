import fs from "fs";
import path from "path";
import type { LocationRef } from "@/features/shared/types";
import { haversineKm, isPhilippinesCoordinate } from "@/lib/data/geo";

export type PublicSchoolAnchor = {
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  source: "osm" | "fallback";
};

type SchoolCacheEntry = {
  barangayCode: string;
  hallLat: number;
  hallLng: number;
  school: PublicSchoolAnchor;
  fetchedAt: string;
};

const memoryCache = new Map<string, PublicSchoolAnchor>();
const CACHE_DIR = path.join(process.cwd(), "data", "cache", "nearest-schools");
const BBOX_PADDING_DEG = 0.05;
const PHOTON_USER_AGENT = "disaster-prep/0.1 (educational; mock-evac-school-lookup)";

function isLikelyPublicSchool(name: string): boolean {
  const normalized = name.trim();
  if (!normalized) return false;

  const lower = normalized.toLowerCase();
  if (
    /university|college|academy|montessori|international|institute|seminary/i.test(
      lower
    )
  ) {
    return false;
  }
  if (/^(st\.|saint|santa|holy|sacred|notre|immaculate)\b/i.test(normalized)) {
    return false;
  }

  return /elementary school|national high school|integrated school|central school|public school|high school|school/i.test(
    lower
  );
}

function readCache(barangayCode: string): PublicSchoolAnchor | undefined {
  const cached = memoryCache.get(barangayCode);
  if (cached) return cached;

  const filePath = path.join(CACHE_DIR, `${barangayCode}.json`);
  if (!fs.existsSync(filePath)) return undefined;

  try {
    const entry = JSON.parse(fs.readFileSync(filePath, "utf-8")) as SchoolCacheEntry;
    memoryCache.set(barangayCode, entry.school);
    return entry.school;
  } catch {
    return undefined;
  }
}

function writeCache(
  barangayCode: string,
  hallLat: number,
  hallLng: number,
  school: PublicSchoolAnchor
): void {
  memoryCache.set(barangayCode, school);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const entry: SchoolCacheEntry = {
    barangayCode,
    hallLat,
    hallLng,
    school,
    fetchedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(CACHE_DIR, `${barangayCode}.json`),
    `${JSON.stringify(entry)}\n`,
    "utf-8"
  );
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string };
};

async function queryPhotonSchools(
  hallLat: number,
  hallLng: number
): Promise<Array<{ name: string; lat: number; lng: number }>> {
  const bbox = [
    hallLng - BBOX_PADDING_DEG,
    hallLat - BBOX_PADDING_DEG,
    hallLng + BBOX_PADDING_DEG,
    hallLat + BBOX_PADDING_DEG,
  ].join(",");

  const url = `https://photon.komoot.io/api/?q=school&bbox=${bbox}&limit=40&osm_tag=amenity:school`;
  const response = await fetch(url, {
    headers: { "User-Agent": PHOTON_USER_AGENT },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { features?: PhotonFeature[] };
  const schools: Array<{ name: string; lat: number; lng: number }> = [];

  for (const feature of payload.features ?? []) {
    const name = feature.properties?.name?.trim();
    const coords = feature.geometry?.coordinates;
    if (!name || !coords) continue;
    const [lng, lat] = coords;
    if (!isPhilippinesCoordinate(lat, lng)) continue;
    schools.push({ name, lat, lng });
  }

  return schools;
}

function pickNearestSchool(
  hallLat: number,
  hallLng: number,
  schools: Array<{ name: string; lat: number; lng: number }>
): PublicSchoolAnchor | undefined {
  const ranked = schools
    .map((school) => ({
      ...school,
      distanceKm: haversineKm(hallLat, hallLng, school.lat, school.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const publicSchool =
    ranked.find((school) => isLikelyPublicSchool(school.name)) ?? ranked[0];

  if (!publicSchool) return undefined;

  return {
    name: publicSchool.name,
    lat: publicSchool.lat,
    lng: publicSchool.lng,
    distanceKm: publicSchool.distanceKm,
    source: "osm",
  };
}

export async function findNearestPublicSchoolForBarangay(
  location: LocationRef
): Promise<PublicSchoolAnchor | undefined> {
  if (!isPhilippinesCoordinate(location.lat, location.lng)) {
    return undefined;
  }

  const hallLat = location.lat as number;
  const hallLng = location.lng as number;
  const cached = readCache(location.barangayCode);
  if (cached) return cached;

  try {
    const schools = await queryPhotonSchools(hallLat, hallLng);
    const nearest = pickNearestSchool(hallLat, hallLng, schools);
    if (nearest) {
      writeCache(location.barangayCode, hallLat, hallLng, nearest);
      return nearest;
    }
  } catch {
    // fall through to undefined; mock center uses fallback naming
  }

  return undefined;
}

export function createFallbackSchoolAnchor(
  location: LocationRef,
  hallLat: number,
  hallLng: number
): PublicSchoolAnchor {
  return {
    name: `${location.barangayName} Public School`,
    lat: hallLat,
    lng: hallLng,
    distanceKm: 0,
    source: "fallback",
  };
}
