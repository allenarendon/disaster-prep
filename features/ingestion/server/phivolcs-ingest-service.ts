import https from "node:https";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { HazardBulletin } from "@/features/shared/types";
import {
  bulletinValidityFromDate,
  buildPhivolcsRawText,
  inferPhivolcsHazardType,
  inferPhivolcsSeverity,
  parsePhivolcsBulletinHtml,
  parsePhivolcsListEntries,
  PHIVOLCS_BULLETIN_LIST_URL,
  phivolcsBulletinId,
  type PhivolcsBulletinDraft,
} from "@/features/ingestion/server/phivolcs-bulletin-parser";
import { mapVolcanoCodeToLocationRefs } from "@/features/ingestion/server/volcano-area-mapper";

const INGESTED_ID_PREFIX = "phivolcs-";
const PHIVOLCS_BASE_URL = "https://wovodat.phivolcs.dost.gov.ph";
const FETCH_TIMEOUT_MS = 15_000;

export interface IngestPhivolcsResult {
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

function isTlsCertificateError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = error.cause as { code?: string } | undefined;
  return (
    cause?.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    cause?.code === "CERT_HAS_EXPIRED" ||
    error.message.toLowerCase().includes("certificate")
  );
}

function shouldUseInsecureTls(): boolean {
  return process.env.PHIVOLCS_TLS_INSECURE === "1";
}

function fetchInsecureTls(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { rejectUnauthorized: false, timeout: FETCH_TIMEOUT_MS },
      (response) => {
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          response.resume();
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error(`Timeout fetching ${url}`));
    });
    request.on("error", reject);
  });
}

async function fetchPhivolcsText(pathOrUrl: string): Promise<string> {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${PHIVOLCS_BASE_URL}${pathOrUrl}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: "text/html",
        "User-Agent": "disaster-prep-ingest/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.text();
  } catch (error) {
    if (shouldUseInsecureTls() || isTlsCertificateError(error)) {
      return fetchInsecureTls(url);
    }
    throw error;
  }
}

function toDbRow(bulletin: PhivolcsBulletinDraft) {
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

function draftFromParsedBulletin(
  parsed: NonNullable<ReturnType<typeof parsePhivolcsBulletinHtml>>
): PhivolcsBulletinDraft | null {
  const affectedAreas = mapVolcanoCodeToLocationRefs(parsed.volcanoCode);
  if (affectedAreas.length === 0) {
    return null;
  }

  const { issuedAt, validUntil } = bulletinValidityFromDate(parsed.bulletinDate);
  if (Number.isNaN(new Date(issuedAt).getTime())) return null;
  if (Number.isNaN(new Date(validUntil).getTime())) return null;

  return {
    id: phivolcsBulletinId(parsed.volcanoCode),
    source: "PHIVOLCS",
    hazardType: inferPhivolcsHazardType(parsed),
    issuedAt,
    validUntil,
    affectedAreas,
    severity: inferPhivolcsSeverity(parsed.alertLevel),
    rawText: buildPhivolcsRawText(parsed),
    feedTitle: parsed.title,
    shouldExpire: parsed.alertLevel <= 0,
  };
}

export async function ingestPhivolcsBulletins(options?: {
  client?: SupabaseClient;
}): Promise<IngestPhivolcsResult> {
  const client = options?.client ?? getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY."
    );
  }

  const result: IngestPhivolcsResult = {
    fetched: 0,
    upserted: 0,
    expired: 0,
    skipped: 0,
    errors: [],
  };

  const listHtml = await fetchPhivolcsText(PHIVOLCS_BULLETIN_LIST_URL);
  const entries = parsePhivolcsListEntries(listHtml);
  result.fetched = entries.length;

  const activeIds = new Set<string>();
  const upsertRows: ReturnType<typeof toDbRow>[] = [];
  const expireIds: string[] = [];

  for (const entry of entries) {
    try {
      const detailHtml = await fetchPhivolcsText(entry.detailPath);
      const parsed = parsePhivolcsBulletinHtml(detailHtml, entry);
      if (!parsed) {
        result.skipped += 1;
        continue;
      }

      const draft = draftFromParsedBulletin(parsed);
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
