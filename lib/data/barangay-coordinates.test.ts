import { describe, expect, it } from "vitest";
import { normalizeLocationCoordinates } from "@/lib/data/barangay-coordinates";
import { getLocationByCode } from "@/lib/data/location-resolver";
import { haversineKm } from "@/lib/data/geo";

describe("barangay coordinate normalization", () => {
  it("corrects Sum-ag Bacolod coordinates away from Luzon drift", () => {
    const raw = getLocationByCode("064501056");
    expect(raw).toBeDefined();

    const normalized = normalizeLocationCoordinates({
      barangayCode: "064501056",
      barangayName: "Sum-ag",
      cityMunicipality: "Bacolod City",
      province: "Negros Occidental",
      region: "Region 06",
      lat: 13.7933,
      lng: 122.0576,
    });

    expect(normalized.lat).toBeDefined();
    expect(normalized.lng).toBeDefined();
    expect(normalized.lat!).toBeLessThan(12);
    expect(normalized.lat!).toBeGreaterThan(9.5);
    expect(haversineKm(10.67, 122.95, normalized.lat!, normalized.lng!)).toBeLessThan(
      40
    );
  });

  it("keeps plausible coordinates for Addition Hills Mandaluyong", () => {
    const normalized = normalizeLocationCoordinates({
      barangayCode: "137401001",
      barangayName: "Addition Hills",
      cityMunicipality: "Mandaluyong",
      province: "Metro Manila",
      region: "NCR",
      lat: 14.5946,
      lng: 121.0391,
    });

    expect(normalized.lat).toBeCloseTo(14.5946, 3);
    expect(normalized.lng).toBeCloseTo(121.0391, 3);
  });
});
