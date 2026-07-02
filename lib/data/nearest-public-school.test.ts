import { afterEach, describe, expect, it, vi } from "vitest";
import { findNearestPublicSchoolForBarangay } from "@/lib/data/nearest-public-school";
import {
  createMockEvacCenterForLocation,
  mockEvacCenterId,
} from "@/lib/data/mock-evac-center";

describe("nearest public school mock evac centers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the nearest mapped public school for mock evac center placement", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [
            {
              properties: { name: "Don Iluminado Nessia, Sr. Elementary School" },
              geometry: { coordinates: [122.9457014, 10.6005826] },
            },
            {
              properties: { name: "St. Benilde School" },
              geometry: { coordinates: [122.9659383, 10.622097] },
            },
          ],
        }),
      })
    );

    const location = {
      barangayCode: "064501056",
      barangayName: "Sum-ag",
      cityMunicipality: "Bacolod City",
      province: "Negros Occidental",
      region: "Region 06",
      lat: 10.5977,
      lng: 122.9631,
    };

    const school = await findNearestPublicSchoolForBarangay(location);
    expect(school?.name).toContain("Elementary School");

    const mock = createMockEvacCenterForLocation(location, school);
    expect(mock.id).toBe(mockEvacCenterId("064501056"));
    expect(mock.name).toContain("Elementary School");
    expect(mock.lat).toBeCloseTo(10.6005826, 4);
    expect(mock.lng).toBeCloseTo(122.9457014, 4);
    expect(mock.isMock).toBe(true);
  });
});
