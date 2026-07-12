import { describe, expect, it, beforeEach } from "vitest";
import { generateGuidance } from "@/features/guidance/server/guidance-service";
import {
  resetLocalStoreForTests,
  setLocalBulletinsForTests,
} from "@/lib/data/local-store";
import { resetDataStoreForTests } from "@/lib/data/supabase-store";
import {
  activeFloodBulletin,
  activeTyphoonBulletin,
  additionHillsLocation,
} from "@/lib/data/test-fixtures";

describe("generateGuidance", () => {
  beforeEach(() => {
    resetDataStoreForTests();
    resetLocalStoreForTests();
  });

  it("returns fallback when no active bulletin exists", async () => {
    const result = await generateGuidance({
      location: {
        barangayCode: "999999999",
        barangayName: "Nowhere",
        cityMunicipality: "Nowhere City",
        province: "Nowhere Province",
        region: "Nowhere Region",
      },
      language: "en",
      requestedAt: new Date().toISOString(),
    });

    expect(result.guidance.length).toBeGreaterThan(0);
    expect(result.guidance.every((g) => g.isFallback)).toBe(true);
    expect(result.guidance[0].bulletinId).toBe("none");
  });

  it("returns guidance for active bulletin location", async () => {
    setLocalBulletinsForTests([activeTyphoonBulletin]);

    const result = await generateGuidance({
      location: additionHillsLocation,
      language: "tl",
      requestedAt: new Date().toISOString(),
    });

    expect(result.guidance.length).toBeGreaterThan(0);
    const hasActiveBulletin = result.guidance.some(
      (g) => g.bulletinId !== "none"
    );
    expect(hasActiveBulletin).toBe(true);
  });

  it("does not merge conflicting bulletins into one response set per bulletin", async () => {
    setLocalBulletinsForTests([activeTyphoonBulletin, activeFloodBulletin]);

    const result = await generateGuidance({
      location: additionHillsLocation,
      language: "en",
      requestedAt: new Date().toISOString(),
    });

    const bulletinIds = new Set(
      result.guidance
        .filter((g) => g.bulletinId !== "none")
        .map((g) => g.bulletinId)
    );
    expect(bulletinIds.size).toBeGreaterThanOrEqual(2);
  });
});
