import { describe, expect, it } from "vitest";
import { searchEvacCenters } from "@/features/evac-centers/server/evac-service";
import { resetDataStoreForTests } from "@/lib/data/supabase-store";
import {
  resetLocalStoreForTests,
  setLocalEvacCentersForTests,
} from "@/lib/data/local-store";
import { additionHillsEvacCenter } from "@/lib/data/test-fixtures";

describe("searchEvacCenters", () => {
  it("marks locations with known in-barangay centers", async () => {
    resetDataStoreForTests();
    resetLocalStoreForTests();
    setLocalEvacCentersForTests([additionHillsEvacCenter]);

    const result = await searchEvacCenters({
      lat: 14.5946,
      lng: 121.0391,
      locationBarangayCode: "137401001",
    });

    expect(result.locationHasKnownCenter).toBe(true);
  });

  it("shows mock placeholder centers for barangays without verified data", async () => {
    resetDataStoreForTests();
    resetLocalStoreForTests();

    const result = await searchEvacCenters({
      lat: 14.5781,
      lng: 121.0352,
      locationBarangayCode: "137401002",
    });

    expect(result.locationHasKnownCenter).toBe(false);
    expect(result.centers.length).toBe(1);
    expect(result.centers[0]?.isMock).toBe(true);
    expect(result.centers[0]?.status).toBe("UNKNOWN");
    expect(result.message).toContain("placeholder evacuation center data");
  });
});
