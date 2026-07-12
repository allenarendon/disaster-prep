import { describe, expect, it } from "vitest";
import {
  searchLocations,
  resolveLocation,
  searchLocationsWithCoverage,
} from "@/lib/data/location-resolver";

describe("location resolver", () => {
  it("finds fuzzy matches for barangay name", () => {
    const matches = searchLocations("Addition Hills");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("returns disambiguation when multiple Addition Hills exist", () => {
    const { resolved, suggestions } = resolveLocation({
      query: "Addition Hills",
    });
    expect(resolved).toBeUndefined();
    expect(suggestions.length).toBeGreaterThan(1);
  });

  it("finds barangays outside the original demo seed set", () => {
    const matches = searchLocations("Quezon City");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("marks barangays without verified LGU data as uncovered", () => {
    const matches = searchLocationsWithCoverage("Mandaluyong", 25);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((item) => !item.knownEvacCenter)).toBe(true);
  });

  it("returns up to 20 matches when limit is requested", () => {
    const matches = searchLocationsWithCoverage("barangay 15", 20);
    expect(matches.length).toBeGreaterThan(5);
    expect(matches.length).toBeLessThanOrEqual(20);
  });

  it("resolves exact barangay by code", () => {
    const { resolved } = resolveLocation({ barangayCode: "137401001" });
    expect(resolved?.barangayName).toBe("Addition Hills");
    expect(resolved?.cityMunicipality).toBe("Mandaluyong");
  });
});
