import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { HazardBulletin } from "@/features/shared/types";
import { mapCapAreasToLocationRefs } from "@/features/ingestion/server/area-mapper";
import {
  bulletinIdFromCap,
  buildRawText,
  inferHazardType,
  inferSeverity,
  parseCapAlertXml,
  parseCapFeedEntries,
  PAGASA_CAP_FEED_URL,
  type IngestedBulletinDraft,
} from "@/features/ingestion/server/cap-parser";

const INGESTED_ID_PREFIX = "pagasa-cap-";
const DEFAULT_MAX_ENTRIES = 30;
const FETCH_TIMEOUT_MS = 15_000;

export interface IngestPagasaResult {
  fetched: number;
  upserted: number;
  expired: number;
  skipped: number;
  errors: string[];
}

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: "application/xml, text/xml, application/atom+xml" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

function toDbRow(bulletin: IngestedBulletinDraft) {
  return {
    id: bulletin.id,
    source: bulletin.source,
    hazard_type: bulletin.hazardType,
    issued_at: bulletin.issuedAt,
    valid_until: bulletin.validUntil,
    affected_areas: bulletin.affectedAreas,
    severity: bulletin.severity,
    raw_text: bulletin.rawText,
  };
}

function draftFromCap(
  capXml: string,
  feedTitle: string
): IngestedBulletinDraft | null {
  const parsed = parseCapAlertXml(capXml, feedTitle);
  if (!parsed) return null;

  const affectedAreas = mapCapAreasToLocationRefs({
    areaDescriptions: parsed.areaDescriptions,
    regionParameter: parsed.regionParameter,
    feedTitle,
  });

  if (affectedAreas.length === 0) {
    return null;
  }

  const issuedAt = new Date(parsed.sent).toISOString();
  const validUntil = new Date(parsed.expires).toISOString();
  if (Number.isNaN(new Date(parsed.sent).getTime())) return null;
  if (Number.isNaN(new Date(parsed.expires).getTime())) return null;

  return {
    id: bulletinIdFromCap(parsed.identifier),
    source: "PAGASA",
    hazardType: inferHazardType(parsed.event, feedTitle),
    issuedAt,
    validUntil,
    affectedAreas,
    severity: inferSeverity(parsed.event, feedTitle),
    rawText: buildRawText(parsed),
    feedTitle,
    shouldExpire: parsed.isCancellation || parsed.isFinal,
  };
}

export async function ingestPagasaCapBulletins(options?: {
  maxEntries?: number;
  client?: SupabaseClient;
}): Promise<IngestPagasaResult> {
  const client = options?.client ?? getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY."
    );
  }

  const maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const result: IngestPagasaResult = {
    fetched: 0,
    upserted: 0,
    expired: 0,
    skipped: 0,
    errors: [],
  };

  const feedXml = await fetchText(PAGASA_CAP_FEED_URL);
  const entries = parseCapFeedEntries(feedXml).slice(0, maxEntries);
  result.fetched = entries.length;

  const activeIds = new Set<string>();
  const upsertRows: ReturnType<typeof toDbRow>[] = [];
  const expireIds: string[] = [];

  for (const entry of entries) {
    try {
      const capXml = await fetchText(entry.capUrl);
      const draft = draftFromCap(capXml, entry.title);
      if (!draft) {
        result.skipped += 1;
        continue;
      }

      if (draft.shouldExpire) {
        expireIds.push(draft.id);
        result.expired += 1;
        continue;
      }

      if (new Date(draft.validUntil) <= new Date()) {
        expireIds.push(draft.id);
        result.skipped += 1;
        continue;
      }

      activeIds.add(draft.id);
      upsertRows.push(toDbRow(draft));
    } catch (error) {
      result.errors.push(
        `${entry.title}: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  if (upsertRows.length > 0) {
    const { error } = await client
      .from("hazard_bulletins")
      .upsert(upsertRows, { onConflict: "id" });
    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
    result.upserted = upsertRows.length;
  }

  const expireTargetIds = [...new Set(expireIds)];
  if (expireTargetIds.length > 0) {
    const expiredAt = new Date(Date.now() - 60_000).toISOString();
    await client
      .from("hazard_bulletins")
      .update({ valid_until: expiredAt })
      .in("id", expireTargetIds);
  }

  const { data: staleRows } = await client
    .from("hazard_bulletins")
    .select("id")
    .like("id", `${INGESTED_ID_PREFIX}%`)
    .gt("valid_until", new Date().toISOString());

  const staleIds = (staleRows ?? [])
    .map((row) => row.id as string)
    .filter((id) => !activeIds.has(id));

  if (staleIds.length > 0) {
    const expiredAt = new Date(Date.now() - 60_000).toISOString();
    await client
      .from("hazard_bulletins")
      .update({ valid_until: expiredAt })
      .in("id", staleIds);
    result.expired += staleIds.length;
  }

  return result;
}

export function mapBulletinRow(row: Record<string, unknown>): HazardBulletin {
  return {
    id: row.id as string,
    source: row.source as HazardBulletin["source"],
    hazardType: row.hazard_type as HazardBulletin["hazardType"],
    issuedAt: row.issued_at as string,
    validUntil: row.valid_until as string,
    affectedAreas: row.affected_areas as HazardBulletin["affectedAreas"],
    severity: row.severity as HazardBulletin["severity"],
    rawText: row.raw_text as string,
  };
}
