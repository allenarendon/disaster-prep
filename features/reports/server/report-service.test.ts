import { describe, expect, it, beforeEach } from "vitest";
import { submitCommunityReport } from "@/features/reports/server/report-service";
import { LocalDataStore, resetLocalStoreForTests } from "@/lib/data/local-store";
import { resetDataStoreForTests } from "@/lib/data/supabase-store";

describe("submitCommunityReport", () => {
  beforeEach(() => {
    resetDataStoreForTests();
    resetLocalStoreForTests();
  });

  const baseInput = {
    type: "ROAD_CONDITION" as const,
    location: {
      barangayCode: "137404001",
      barangayName: "Addition Hills",
      cityMunicipality: "Mandaluyong City",
      province: "Metro Manila",
      region: "NCR",
    },
    message: "Road flooded near bridge",
    submittedAt: new Date().toISOString(),
    clientHash: "test-client-hash",
  };

  it("rejects EVAC_STATUS without targetEvacCenterId at API schema level", async () => {
    const { communityReportInputSchema } = await import(
      "@/lib/validation/schemas"
    );
    const parsed = communityReportInputSchema.safeParse({
      ...baseInput,
      type: "EVAC_STATUS",
      reportedStatus: "FULL",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects 11th report within rate limit window", async () => {
    const store = new LocalDataStore();

    for (let i = 0; i < 10; i++) {
      await store.createReport({
        ...baseInput,
        clientHash: "rate-limit-hash",
        message: `Report ${i}`,
        submittedAt: new Date().toISOString(),
      });
    }

    const result = await submitCommunityReport({
      ...baseInput,
      clientHash: "rate-limit-hash",
      message: "11th report",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("RATE_LIMIT_EXCEEDED");
    }
  });
});
