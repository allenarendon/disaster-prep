import { describe, expect, it, beforeEach } from "vitest";
import { resolveEvacCenterStatus } from "@/features/evac-centers/server/status-resolver";
import { LocalDataStore, resetLocalStoreForTests } from "@/lib/data/local-store";
import type { EvacuationCenter } from "@/features/shared/types";

const baseCenter: EvacuationCenter = {
  id: "evac-test-001",
  name: "Test Center",
  location: {
    barangayCode: "137404001",
    barangayName: "Addition Hills",
    cityMunicipality: "Mandaluyong City",
    province: "Metro Manila",
    region: "NCR",
  },
  lat: 14.58,
  lng: 121.04,
  status: "OPEN",
  statusUpdatedAt: new Date().toISOString(),
  statusSource: "LGU_ADMIN",
  reportCount: 0,
};

describe("resolveEvacCenterStatus", () => {
  let store: LocalDataStore;

  beforeEach(() => {
    resetLocalStoreForTests();
    store = new LocalDataStore();
  });

  it("keeps LGU OPEN status when 2 community reports say FULL", async () => {
    const now = new Date().toISOString();
    for (let i = 0; i < 2; i++) {
      await store.createReport({
        type: "EVAC_STATUS",
        targetEvacCenterId: baseCenter.id,
        location: baseCenter.location,
        message: `Report ${i}`,
        reportedStatus: "FULL",
        submittedAt: now,
        clientHash: `hash-${i}`,
      });
    }

    const resolved = await resolveEvacCenterStatus(baseCenter, store);
    expect(resolved.status).toBe("OPEN");
    expect(resolved.conflictNote).toContain("2 recent reports");
  });

  it("defaults to UNKNOWN when no status data", async () => {
    const unknownCenter: EvacuationCenter = {
      ...baseCenter,
      status: "UNKNOWN",
      statusSource: "DEFAULT_UNKNOWN",
    };

    const resolved = await resolveEvacCenterStatus(unknownCenter, store);
    expect(resolved.status).toBe("UNKNOWN");
  });

  it("updates status after 3 corroborating community reports", async () => {
    const center: EvacuationCenter = {
      ...baseCenter,
      status: "UNKNOWN",
      statusSource: "DEFAULT_UNKNOWN",
    };

    const now = new Date().toISOString();
    for (let i = 0; i < 3; i++) {
      await store.createReport({
        type: "EVAC_STATUS",
        targetEvacCenterId: center.id,
        location: center.location,
        message: `Full report ${i}`,
        reportedStatus: "FULL",
        submittedAt: now,
        clientHash: `hash-full-${i}`,
      });
    }

    const resolved = await resolveEvacCenterStatus(center, store);
    expect(resolved.status).toBe("FULL");
    expect(resolved.statusSource).toBe("COMMUNITY_REPORT");
  });
});
