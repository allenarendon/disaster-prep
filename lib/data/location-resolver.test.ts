import { describe, expect, it } from "vitest";
import { searchLocations, resolveLocation } from "@/lib/data/location-resolver";

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

  it("resolves exact barangay by code", () => {
    const { resolved } = resolveLocation({ barangayCode: "137404001" });
    expect(resolved?.barangayName).toBe("Addition Hills");
    expect(resolved?.cityMunicipality).toBe("Mandaluyong City");
  });
});
