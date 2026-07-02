import { describe, expect, it } from "vitest";
import { resolveHotlines } from "@/features/hotlines/server/hotline-resolver";

describe("hotline resolver", () => {
  it("includes national hotlines for any barangay", () => {
    const result = resolveHotlines({
      barangayCode: "999999999",
      barangayName: "Unknown",
      cityMunicipality: "Unknown City",
      province: "Unknown Province",
      region: "Unknown Region",
    });

    expect(result.hotlines.some((h) => h.number === "911")).toBe(true);
    expect(result.hotlines.some((h) => h.number === "117")).toBe(true);
    expect(result.hasBarangaySpecific).toBe(false);
  });

  it("includes city and barangay contacts for seeded demo locations", () => {
    const result = resolveHotlines({
      barangayCode: "137401001",
      barangayName: "Addition Hills",
      cityMunicipality: "Mandaluyong",
      province: "Metro Manila",
      region: "NCR",
    });

    expect(result.hasCitySpecific).toBe(true);
    expect(result.hasBarangaySpecific).toBe(true);
    expect(
      result.hotlines.some(
        (h) => h.category === "BARANGAY" && h.label.includes("Addition Hills")
      )
    ).toBe(true);
    expect(result.hotlines.some((h) => h.category === "DRRM")).toBe(true);
  });
});
