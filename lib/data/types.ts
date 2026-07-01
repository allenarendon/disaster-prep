import type {
  CommunityReport,
  CommunityReportInput,
  EvacuationCenter,
  HazardBulletin,
  LocationRef,
  OfflineBundle,
} from "@/features/shared/types";

export interface DataStore {
  getActiveBulletinsForLocation(location: LocationRef): Promise<HazardBulletin[]>;
  getEvacCentersByBarangay(barangayCode: string): Promise<EvacuationCenter[]>;
  getAllEvacCenters(): Promise<EvacuationCenter[]>;
  getEvacCenterById(id: string): Promise<EvacuationCenter | undefined>;
  updateEvacCenterStatus(
    id: string,
    status: EvacuationCenter["status"],
    updatedBy: string
  ): Promise<EvacuationCenter | undefined>;
  createReport(input: CommunityReportInput): Promise<CommunityReport>;
  getReportsForEvacCenter(
    evacCenterId: string,
    sinceIso: string
  ): Promise<CommunityReport[]>;
  countReportsByClientHash(
    clientHash: string,
    sinceIso: string
  ): Promise<number>;
  getOfflineBundle(): Promise<OfflineBundle>;
}
