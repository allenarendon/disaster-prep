import type { LocationRef } from "@/features/shared/types";
import {
  getPhilippinesCoordinates,
  haversineKm,
  isPhilippinesCoordinate,
  PHILIPPINES_DEFAULT_CENTER,
} from "@/lib/data/geo";
import { getSeedLocations } from "@/lib/data/seed-loader";

type LatLng = { lat: number; lng: number };

const CLUSTER_RADIUS_KM = 25;
const MAX_BARANGAY_CITY_DRIFT_KM = 40;

const REGION_BOUNDS: Record<
  string,
  { minLat: number; maxLat: number; minLng: number; maxLng: number }
> = {
  NCR: { minLat: 14.2, maxLat: 14.85, minLng: 120.85, maxLng: 121.15 },
  "Region 01": { minLat: 15.5, maxLat: 18.8, minLng: 119.5, maxLng: 121.0 },
  "Region 02": { minLat: 16.0, maxLat: 19.5, minLng: 120.5, maxLng: 122.5 },
  "Region 03": { minLat: 14.5, maxLat: 16.5, minLng: 119.5, maxLng: 121.5 },
  "Region IV-A": { minLat: 13.5, maxLat: 15.5, minLng: 120.5, maxLng: 122.5 },
  "Region 05": { minLat: 12.5, maxLat: 14.5, minLng: 122.5, maxLng: 124.5 },
  "Region 06": { minLat: 9.5, maxLat: 12.0, minLng: 121.5, maxLng: 123.5 },
  "Region 07": { minLat: 9.0, maxLat: 11.5, minLng: 123.0, maxLng: 124.5 },
  "Region 08": { minLat: 9.5, maxLat: 12.5, minLng: 124.0, maxLng: 126.0 },
  "Region 09": { minLat: 6.5, maxLat: 9.0, minLng: 121.5, maxLng: 123.5 },
  "Region 10": { minLat: 7.5, maxLat: 9.5, minLng: 123.5, maxLng: 125.5 },
  "Region 11": { minLat: 5.5, maxLat: 8.0, minLng: 125.0, maxLng: 127.0 },
  "Region 12": { minLat: 5.0, maxLat: 7.5, minLng: 124.0, maxLng: 125.5 },
  "Region 13": { minLat: 7.5, maxLat: 10.0, minLng: 125.0, maxLng: 127.0 },
  "Region 17": { minLat: 10.0, maxLat: 14.0, minLng: 117.0, maxLng: 122.5 },
  CAR: { minLat: 16.5, maxLat: 18.5, minLng: 120.5, maxLng: 121.5 },
  BARMM: { minLat: 4.5, maxLat: 7.5, minLng: 119.5, maxLng: 124.5 },
};

const cityClusterCache = new Map<string, LatLng>();

function isCoordinateInRegion(lat: number, lng: number, region: string): boolean {
  const bounds = REGION_BOUNDS[region];
  if (!bounds) return isPhilippinesCoordinate(lat, lng);
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

function findDenseClusterCenter(coords: LatLng[]): LatLng | undefined {
  if (coords.length === 0) return undefined;
  if (coords.length === 1) return coords[0];

  let best = coords[0];
  let bestCount = 0;

  for (const candidate of coords) {
    const count = coords.filter(
      (point) =>
        haversineKm(candidate.lat, candidate.lng, point.lat, point.lng) <=
        CLUSTER_RADIUS_KM
    ).length;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }

  const cluster = coords.filter(
    (point) =>
      haversineKm(best.lat, best.lng, point.lat, point.lng) <= CLUSTER_RADIUS_KM
  );

  return {
    lat: cluster.reduce((sum, point) => sum + point.lat, 0) / cluster.length,
    lng: cluster.reduce((sum, point) => sum + point.lng, 0) / cluster.length,
  };
}

function cityCacheKey(location: LocationRef): string {
  return `${location.region}|${location.province}|${location.cityMunicipality}`;
}

export function getCityClusterCenter(location: LocationRef): LatLng | undefined {
  const key = cityCacheKey(location);
  const cached = cityClusterCache.get(key);
  if (cached) return cached;

  const peers = getSeedLocations().filter(
    (peer) =>
      peer.cityMunicipality === location.cityMunicipality &&
      peer.province === location.province &&
      peer.region === location.region
  );

  const inRegionCoords = peers
    .map((peer) => getPhilippinesCoordinates(peer.lat, peer.lng))
    .filter((coords): coords is LatLng => coords !== undefined)
    .filter((coords) => isCoordinateInRegion(coords.lat, coords.lng, location.region));

  const cluster = findDenseClusterCenter(inRegionCoords);
  if (cluster) {
    cityClusterCache.set(key, cluster);
  }
  return cluster;
}

export function normalizeLocationCoordinates(location: LocationRef): LocationRef {
  const rawCoords = getPhilippinesCoordinates(location.lat, location.lng);
  const cityCluster = getCityClusterCenter(location);

  if (
    rawCoords &&
    isCoordinateInRegion(rawCoords.lat, rawCoords.lng, location.region)
  ) {
    if (
      !cityCluster ||
      haversineKm(
        rawCoords.lat,
        rawCoords.lng,
        cityCluster.lat,
        cityCluster.lng
      ) <= MAX_BARANGAY_CITY_DRIFT_KM
    ) {
      return location;
    }
  }

  if (cityCluster) {
    return {
      ...location,
      lat: cityCluster.lat,
      lng: cityCluster.lng,
    };
  }

  if (rawCoords) {
    return location;
  }

  return {
    ...location,
    lat: PHILIPPINES_DEFAULT_CENTER.lat,
    lng: PHILIPPINES_DEFAULT_CENTER.lng,
  };
}
