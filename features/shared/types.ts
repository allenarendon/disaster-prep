// ── Location ──────────────────────────────────────────────
export interface LocationRef {
  barangayCode: string;
  barangayName: string;
  cityMunicipality: string;
  province: string;
  region: string;
  lat?: number;
  lng?: number;
}

// ── Language ──────────────────────────────────────────────
export type LanguageCode = "tl" | "ceb" | "en";

export const SUPPORTED_LANGUAGES: LanguageCode[] = ["tl", "ceb", "en"];

// ── Hazard Bulletin ───────────────────────────────────────
export type HazardSource = "PAGASA" | "PHIVOLCS" | "OCD" | "MANUAL_ADMIN";
export type HazardType =
  | "TYPHOON"
  | "FLOOD"
  | "STORM_SURGE"
  | "LANDSLIDE"
  | "EARTHQUAKE";

export interface HazardBulletin {
  id: string;
  source: HazardSource;
  hazardType: HazardType;
  issuedAt: string;
  validUntil: string;
  affectedAreas: LocationRef[];
  severity: 1 | 2 | 3 | 4 | 5;
  rawText: string;
}

// ── AI-Generated Guidance ─────────────────────────────────
export type GuidancePhase =
  | "NOW"
  | "NEXT_24H"
  | "DURING_IMPACT"
  | "AFTERMATH";

export interface GuidanceRequest {
  location: LocationRef;
  language: LanguageCode;
  requestedAt: string;
}

export interface GuidanceResponse {
  bulletinId: string;
  generatedAt: string;
  language: LanguageCode;
  phase: GuidancePhase;
  summary: string;
  actionItems: string[];
  sourceAttribution: string;
  isFallback: boolean;
  hazardType?: HazardType;
  severity?: number;
}

export interface GuidanceResult {
  guidance: GuidanceResponse[];
  disambiguation?: LocationRef[];
}

// ── Evacuation Centers ────────────────────────────────────
export type EvacStatus = "OPEN" | "FULL" | "CLOSED" | "UNKNOWN";
export type EvacStatusSource =
  | "LGU_ADMIN"
  | "COMMUNITY_REPORT"
  | "DEFAULT_UNKNOWN";

export interface EvacuationCenter {
  id: string;
  name: string;
  location: LocationRef;
  lat: number;
  lng: number;
  capacity?: number;
  status: EvacStatus;
  statusUpdatedAt: string;
  statusSource: EvacStatusSource;
  reportCount: number;
  distanceKm?: number;
  isStale?: boolean;
  conflictNote?: string;
}

// ── Community Reports ─────────────────────────────────────
export type ReportType = "EVAC_STATUS" | "ROAD_CONDITION" | "OTHER_HAZARD";

export interface CommunityReport {
  id: string;
  type: ReportType;
  targetEvacCenterId?: string;
  location: LocationRef;
  message: string;
  reportedStatus?: EvacStatus;
  submittedAt: string;
  clientHash: string;
  needsReview?: boolean;
}

export interface CommunityReportInput {
  type: ReportType;
  targetEvacCenterId?: string;
  location: LocationRef;
  message: string;
  reportedStatus?: EvacStatus;
  submittedAt: string;
  clientHash: string;
  needsReview?: boolean;
}

// ── Shareable Alert ───────────────────────────────────────
export interface ShareableAlert {
  guidanceResponseId: string;
  shareText: string;
  shareUrl: string;
}

// ── Offline Bundle ────────────────────────────────────────
export type OfflineHazardKey =
  | "TYPHOON"
  | "FLOOD"
  | "STORM_SURGE"
  | "LANDSLIDE";

export interface OfflineBundle {
  bundleVersion: string;
  generatedAt: string;
  validForRegion: string;
  staticChecklists: Record<LanguageCode, string[]>;
  hazardSpecificGuidance: Record<
    OfflineHazardKey,
    Record<LanguageCode, string[]>
  >;
  lastKnownEvacCenters: EvacuationCenter[];
}

// ── API Errors ────────────────────────────────────────────
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    field?: string;
  };
}

export interface LocationSearchResult {
  matches: LocationRef[];
  query: string;
}

// ── Emergency Hotlines ────────────────────────────────────
export type HotlineCategory =
  | "EMERGENCY"
  | "POLICE"
  | "FIRE"
  | "DRRM"
  | "BARANGAY"
  | "MEDICAL"
  | "OTHER";

export interface EmergencyHotline {
  category: HotlineCategory;
  label: string;
  number: string;
  notes?: string;
  scope: "national" | "city" | "barangay";
}

export interface HotlinesResponse {
  location: LocationRef;
  hotlines: EmergencyHotline[];
  hasBarangaySpecific: boolean;
  hasCitySpecific: boolean;
  disclaimer: string;
}
