const EARTH_RADIUS_KM = 6371;

/** Rough bounding box for mainland Philippines + major islands. */
export const PHILIPPINES_BOUNDS = {
  minLat: 4.5,
  maxLat: 21.5,
  minLng: 116,
  maxLng: 127.5,
} as const;

export const PHILIPPINES_DEFAULT_CENTER = {
  lat: 12.8797,
  lng: 121.774,
} as const;

export function isPhilippinesCoordinate(
  lat?: number,
  lng?: number
): boolean {
  return (
    lat !== undefined &&
    lng !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= PHILIPPINES_BOUNDS.minLat &&
    lat <= PHILIPPINES_BOUNDS.maxLat &&
    lng >= PHILIPPINES_BOUNDS.minLng &&
    lng <= PHILIPPINES_BOUNDS.maxLng
  );
}

export function getPhilippinesCoordinates(
  lat?: number,
  lng?: number
): { lat: number; lng: number } | undefined {
  if (!isPhilippinesCoordinate(lat, lng) || lat === undefined || lng === undefined) {
    return undefined;
  }
  return { lat, lng };
}

const MAX_BARANGAY_CENTER_DRIFT_KM = 25;

export function resolveMapCenter(
  location: { lat?: number; lng?: number },
  centers: Array<{ lat: number; lng: number }> = []
): { lat: number; lng: number } {
  const validCenters = centers.filter((center) =>
    isPhilippinesCoordinate(center.lat, center.lng)
  );

  if (validCenters.length > 0) {
    const centersAverage = {
      lat:
        validCenters.reduce((sum, center) => sum + center.lat, 0) /
        validCenters.length,
      lng:
        validCenters.reduce((sum, center) => sum + center.lng, 0) /
        validCenters.length,
    };

    const barangayCoords = getPhilippinesCoordinates(
      location.lat,
      location.lng
    );
    const driftKm = barangayCoords
      ? haversineKm(
          barangayCoords.lat,
          barangayCoords.lng,
          centersAverage.lat,
          centersAverage.lng
        )
      : null;

    if (
      barangayCoords &&
      driftKm !== null &&
      driftKm <= MAX_BARANGAY_CENTER_DRIFT_KM
    ) {
      return barangayCoords;
    }

    return centersAverage;
  }

  const barangayCoords = getPhilippinesCoordinates(location.lat, location.lng);
  if (barangayCoords) {
    return barangayCoords;
  }

  return { ...PHILIPPINES_DEFAULT_CENTER };
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const RADIUS_STEPS_KM = [5, 15, 30] as const;
