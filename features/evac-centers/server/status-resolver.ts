import type {
  EvacStatus,
  EvacuationCenter,
  HazardBulletin,
} from "@/features/shared/types";
import type { DataStore } from "@/lib/data/types";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function countCorroboratingReports(
  reports: { reportedStatus?: EvacStatus }[],
  status: EvacStatus
): number {
  return reports.filter((r) => r.reportedStatus === status).length;
}

function dominantCommunityStatus(
  reports: { reportedStatus?: EvacStatus }[]
): { status: EvacStatus; count: number } | null {
  const counts = new Map<EvacStatus, number>();
  for (const report of reports) {
    if (!report.reportedStatus) continue;
    counts.set(
      report.reportedStatus,
      (counts.get(report.reportedStatus) ?? 0) + 1
    );
  }

  let best: { status: EvacStatus; count: number } | null = null;
  for (const [status, count] of counts.entries()) {
    if (!best || count > best.count) {
      best = { status, count };
    }
  }
  return best;
}

export async function resolveEvacCenterStatus(
  center: EvacuationCenter,
  store: DataStore,
  activeBulletins: HazardBulletin[] = []
): Promise<EvacuationCenter> {
  const sinceIso = new Date(Date.now() - SIX_HOURS_MS).toISOString();
  const recentReports = await store.getReportsForEvacCenter(center.id, sinceIso);
  const dominant = dominantCommunityStatus(recentReports);
  const reportCount = dominant?.count ?? 0;

  const now = Date.now();
  const statusAge = now - new Date(center.statusUpdatedAt).getTime();
  const isStale =
    activeBulletins.length > 0 && statusAge > TWENTY_FOUR_HOURS_MS;

  let status: EvacStatus = center.status ?? "UNKNOWN";
  let statusSource = center.statusSource;
  let conflictNote: string | undefined;

  if (!center.status || center.statusSource === "DEFAULT_UNKNOWN") {
    status = "UNKNOWN";
    statusSource = "DEFAULT_UNKNOWN";
  }

  if (center.statusSource === "LGU_ADMIN") {
    status = center.status;
    statusSource = "LGU_ADMIN";

    if (
      dominant &&
      dominant.count >= 1 &&
      dominant.status !== center.status
    ) {
      conflictNote = `LGU says ${center.status.toLowerCase()}, but ${dominant.count} recent report${dominant.count > 1 ? "s" : ""} say ${dominant.status.toLowerCase()}.`;
    }
  } else if (dominant && dominant.count >= 3) {
    status = dominant.status;
    statusSource = "COMMUNITY_REPORT";
  } else {
    status = center.statusSource === "DEFAULT_UNKNOWN" ? "UNKNOWN" : center.status;
    if (status === "OPEN" && center.statusSource === "DEFAULT_UNKNOWN") {
      status = "UNKNOWN";
    }
  }

  return {
    ...center,
    status,
    statusSource,
    reportCount,
    isStale,
    conflictNote,
  };
}

export async function resolveAllEvacCenters(
  centers: EvacuationCenter[],
  store: DataStore,
  activeBulletins: HazardBulletin[] = []
): Promise<EvacuationCenter[]> {
  return Promise.all(
    centers.map((c) => resolveEvacCenterStatus(c, store, activeBulletins))
  );
}
