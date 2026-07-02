import type {
  CommunityReport,
  CommunityReportInput,
  EvacuationCenter,
  HazardBulletin,
  LocationRef,
  OfflineBundle,
} from "@/features/shared/types";
import {
  getSeedBulletins,
  getSeedEvacCenters,
  getSeedOfflineBundle,
} from "@/lib/data/seed-loader";
import {
  getEvacCentersForBarangayAsync,
} from "@/lib/data/evac-center-catalog";
import { isMockEvacCenterId } from "@/lib/data/mock-evac-center";
import { locationMatchesArea } from "@/lib/data/location-resolver";
import type { DataStore } from "@/lib/data/types";

type RawEvacCenter = Omit<EvacuationCenter, "reportCount">;

interface MutableState {
  evacCenters: RawEvacCenter[];
  reports: CommunityReport[];
}

const state: MutableState = {
  evacCenters: getSeedEvacCenters(),
  reports: [],
};

function isActiveBulletin(bulletin: HazardBulletin, now = new Date()): boolean {
  return new Date(bulletin.validUntil) > now;
}

export class LocalDataStore implements DataStore {
  async getActiveBulletinsForLocation(
    location: LocationRef
  ): Promise<HazardBulletin[]> {
    const bulletins = getSeedBulletins();
    return bulletins
      .filter((b) => isActiveBulletin(b))
      .filter((b) =>
        b.affectedAreas.some((area) => locationMatchesArea(location, area))
      )
      .sort((a, b) => b.severity - a.severity);
  }

  async getEvacCentersByBarangay(
    barangayCode: string
  ): Promise<EvacuationCenter[]> {
    return (await getEvacCentersForBarangayAsync(barangayCode)).map((c) => ({
      ...c,
      reportCount: 0,
    }));
  }

  async getAllEvacCenters(): Promise<EvacuationCenter[]> {
    return state.evacCenters.map((c) => ({ ...c, reportCount: 0 }));
  }

  async getEvacCenterById(id: string): Promise<EvacuationCenter | undefined> {
    const center = state.evacCenters.find((c) => c.id === id);
    if (center) {
      return { ...center, reportCount: 0 };
    }

    if (isMockEvacCenterId(id)) {
      const barangayCode = id.slice("mock-evac-".length);
      const mock = (await getEvacCentersForBarangayAsync(barangayCode)).find(
        (item) => item.id === id
      );
      return mock ? { ...mock, reportCount: 0 } : undefined;
    }

    return undefined;
  }

  async updateEvacCenterStatus(
    id: string,
    status: EvacuationCenter["status"],
    _updatedBy: string
  ): Promise<EvacuationCenter | undefined> {
    let index = state.evacCenters.findIndex((c) => c.id === id);
    if (index === -1) {
      const existing = await this.getEvacCenterById(id);
      if (!existing) return undefined;
      state.evacCenters.push(existing);
      index = state.evacCenters.length - 1;
    }

    state.evacCenters[index] = {
      ...state.evacCenters[index],
      status,
      statusSource: "LGU_ADMIN",
      statusUpdatedAt: new Date().toISOString(),
    };

    return { ...state.evacCenters[index], reportCount: 0 };
  }

  async createReport(input: CommunityReportInput): Promise<CommunityReport> {
    const report: CommunityReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...input,
      needsReview: input.needsReview,
    };
    state.reports.push(report);
    return report;
  }

  async getReportsForEvacCenter(
    evacCenterId: string,
    sinceIso: string
  ): Promise<CommunityReport[]> {
    const since = new Date(sinceIso).getTime();
    return state.reports.filter(
      (r) =>
        r.type === "EVAC_STATUS" &&
        r.targetEvacCenterId === evacCenterId &&
        new Date(r.submittedAt).getTime() >= since
    );
  }

  async countReportsByClientHash(
    clientHash: string,
    sinceIso: string
  ): Promise<number> {
    const since = new Date(sinceIso).getTime();
    return state.reports.filter(
      (r) =>
        r.clientHash === clientHash &&
        new Date(r.submittedAt).getTime() >= since
    ).length;
  }

  async getOfflineBundle(): Promise<OfflineBundle> {
    const centers = await this.getAllEvacCenters();
    const bundle = getSeedOfflineBundle();
    return {
      ...bundle,
      lastKnownEvacCenters: centers,
    };
  }
}

export function resetLocalStoreForTests(): void {
  state.evacCenters = [...getSeedEvacCenters()];
  state.reports = [];
}
