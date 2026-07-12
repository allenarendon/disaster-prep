import { describe, expect, it } from "vitest";
import { getEvacCentersForBarangay } from "@/lib/data/evac-center-catalog";
import {
  createMockEvacCenterForLocation,
  mockEvacCenterId,
} from "@/lib/data/mock-evac-center";

describe("mock evacuation centers", () => {
  it("creates a deterministic mock center per barangay", () => {
    const location = {
      barangayCode: "137401002",
      barangayName: "Bagong Silang",
      cityMunicipality: "Mandaluyong",
      province: "Metro Manila",
      region: "NCR",
      lat: 14.5781,
      lng: 121.0352,
    };

    const mock = createMockEvacCenterForLocation(location, {
      name: `${location.barangayName} Public School`,
      lat: location.lat as number,
      lng: location.lng as number,
    });

    expect(mock.id).toBe(mockEvacCenterId("137401002"));
    expect(mock.isMock).toBe(true);
    expect(mock.status).toBe("UNKNOWN");
    expect(mock.statusSource).toBe("DEFAULT_UNKNOWN");
    expect(mock.name).toContain("Public School");
    expect(mock.name).toContain("(Mock)");
  });

  it("returns mock centers for uncovered barangays", () => {
    const mockOnly = getEvacCentersForBarangay("137401002");
    expect(mockOnly).toHaveLength(1);
    expect(mockOnly[0]?.isMock).toBe(true);
  });
});
