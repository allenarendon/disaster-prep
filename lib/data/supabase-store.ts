import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  CommunityReport,
  CommunityReportInput,
  EvacuationCenter,
  HazardBulletin,
  LocationRef,
  OfflineBundle,
} from "@/features/shared/types";
import type { DataStore } from "@/lib/data/types";
import { LocalDataStore } from "@/lib/data/local-store";
import { getSeedOfflineBundle } from "@/lib/data/seed-loader";

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function mapBulletin(row: Record<string, unknown>): HazardBulletin {
  return {
    id: row.id as string,
    source: row.source as HazardBulletin["source"],
    hazardType: row.hazard_type as HazardBulletin["hazardType"],
    issuedAt: row.issued_at as string,
    validUntil: row.valid_until as string,
    affectedAreas: row.affected_areas as LocationRef[],
    severity: row.severity as HazardBulletin["severity"],
    rawText: row.raw_text as string,
  };
}

function mapEvacCenter(row: Record<string, unknown>): EvacuationCenter {
  return {
    id: row.id as string,
    name: row.name as string,
    location: row.location as LocationRef,
    lat: row.lat as number,
    lng: row.lng as number,
    capacity: row.capacity as number | undefined,
    status: row.status as EvacuationCenter["status"],
    statusUpdatedAt: row.status_updated_at as string,
    statusSource: row.status_source as EvacuationCenter["statusSource"],
    reportCount: 0,
  };
}

class SupabaseDataStore implements DataStore {
  constructor(private client: SupabaseClient) {}

  async getActiveBulletinsForLocation(
    location: LocationRef
  ): Promise<HazardBulletin[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("hazard_bulletins")
      .select("*")
      .gt("valid_until", now);

    if (error || !data) return [];

    const bulletins = data.map(mapBulletin);
    return bulletins
      .filter((b) =>
        b.affectedAreas.some(
          (area) =>
            area.barangayCode === location.barangayCode ||
            area.province === location.province ||
            area.region === location.region
        )
      )
      .sort((a, b) => b.severity - a.severity);
  }

  async getEvacCentersByBarangay(
    barangayCode: string
  ): Promise<EvacuationCenter[]> {
    const { data } = await this.client
      .from("evacuation_centers")
      .select("*")
      .eq("barangay_code", barangayCode);
    return (data ?? []).map(mapEvacCenter);
  }

  async getAllEvacCenters(): Promise<EvacuationCenter[]> {
    const { data } = await this.client.from("evacuation_centers").select("*");
    return (data ?? []).map(mapEvacCenter);
  }

  async getEvacCenterById(id: string): Promise<EvacuationCenter | undefined> {
    const { data } = await this.client
      .from("evacuation_centers")
      .select("*")
      .eq("id", id)
      .single();
    return data ? mapEvacCenter(data) : undefined;
  }

  async updateEvacCenterStatus(
    id: string,
    status: EvacuationCenter["status"],
    updatedBy: string
  ): Promise<EvacuationCenter | undefined> {
    const { data, error } = await this.client
      .from("evacuation_centers")
      .update({
        status,
        status_source: "LGU_ADMIN",
        status_updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return undefined;
    return mapEvacCenter(data);
  }

  async createReport(input: CommunityReportInput): Promise<CommunityReport> {
    const row = {
      type: input.type,
      target_evac_center_id: input.targetEvacCenterId ?? null,
      location: input.location,
      message: input.message,
      reported_status: input.reportedStatus ?? null,
      submitted_at: input.submittedAt,
      client_hash: input.clientHash,
      needs_review: false,
    };

    const { data, error } = await this.client
      .from("community_reports")
      .insert(row)
      .select()
      .single();

    if (error || !data) {
      throw new Error("Failed to create report");
    }

    return {
      id: data.id as string,
      type: data.type as CommunityReport["type"],
      targetEvacCenterId: data.target_evac_center_id as string | undefined,
      location: data.location as LocationRef,
      message: data.message as string,
      reportedStatus: data.reported_status as CommunityReport["reportedStatus"],
      submittedAt: data.submitted_at as string,
      clientHash: data.client_hash as string,
      needsReview: data.needs_review as boolean,
    };
  }

  async getReportsForEvacCenter(
    evacCenterId: string,
    sinceIso: string
  ): Promise<CommunityReport[]> {
    const { data } = await this.client
      .from("community_reports")
      .select("*")
      .eq("target_evac_center_id", evacCenterId)
      .eq("type", "EVAC_STATUS")
      .gte("submitted_at", sinceIso);

    return (data ?? []).map((row) => ({
      id: row.id as string,
      type: row.type as CommunityReport["type"],
      targetEvacCenterId: row.target_evac_center_id as string | undefined,
      location: row.location as LocationRef,
      message: row.message as string,
      reportedStatus: row.reported_status as CommunityReport["reportedStatus"],
      submittedAt: row.submitted_at as string,
      clientHash: row.client_hash as string,
      needsReview: row.needs_review as boolean,
    }));
  }

  async countReportsByClientHash(
    clientHash: string,
    sinceIso: string
  ): Promise<number> {
    const { count } = await this.client
      .from("community_reports")
      .select("*", { count: "exact", head: true })
      .eq("client_hash", clientHash)
      .gte("submitted_at", sinceIso);

    return count ?? 0;
  }

  async getOfflineBundle(): Promise<OfflineBundle> {
    const centers = await this.getAllEvacCenters();
    const bundle = getSeedOfflineBundle();
    return { ...bundle, lastKnownEvacCenters: centers };
  }
}

let storeInstance: DataStore | null = null;

export function getDataStore(): DataStore {
  if (storeInstance) return storeInstance;

  const supabase = getSupabaseClient();
  storeInstance = supabase
    ? new SupabaseDataStore(supabase)
    : new LocalDataStore();

  return storeInstance;
}

export function resetDataStoreForTests(): void {
  storeInstance = null;
}
