import type { HazardBulletin, HazardType, LocationRef } from "@/features/shared/types";

export const PHIVOLCS_BULLETIN_LIST_URL =
  "https://wovodat.phivolcs.dost.gov.ph/bulletin/list-of-bulletin";

export interface PhivolcsListEntry {
  volcanoCode: string;
  bulletinId: string;
  title: string;
  detailPath: string;
}

export interface ParsedPhivolcsBulletin {
  volcanoCode: string;
  bulletinId: string;
  volcanoName: string;
  title: string;
  bulletinDate: string;
  alertLevel: number;
  statusText: string;
  parameters: Array<{ name: string; value: string }>;
  prohibitedActions: string[];
  reminders: string[];
  hazards: string[];
  locationText: string;
}

export interface PhivolcsBulletinDraft {
  id: string;
  source: "PHIVOLCS";
  hazardType: HazardType;
  issuedAt: string;
  validUntil: string;
  affectedAreas: LocationRef[];
  severity: HazardBulletin["severity"];
  rawText: string;
  feedTitle: string;
  shouldExpire: boolean;
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractInputValue(html: string, id: string): string | undefined {
  const pattern = new RegExp(
    `id="${id}"[^>]*value="([^"]+)"|value="([^"]+)"[^>]*id="${id}"`,
    "i"
  );
  const match = html.match(pattern);
  return decodeHtml(match?.[1] ?? match?.[2] ?? "").trim() || undefined;
}

export function parsePhivolcsListEntries(listHtml: string): PhivolcsListEntry[] {
  const entries: PhivolcsListEntry[] = [];
  const seen = new Set<string>();
  const linkPattern =
    /href="(\/bulletin\/activity-([a-z]+)\?bid=(\d+)(?:&amp;|&)lang=en)"/gi;

  for (const match of listHtml.matchAll(linkPattern)) {
    const detailPath = decodeHtml(match[1]);
    const volcanoCode = match[2].toLowerCase();
    const bulletinId = match[3];
    const key = `${volcanoCode}:${bulletinId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const blockStart = Math.max(0, (match.index ?? 0) - 400);
    const blockEnd = Math.min(listHtml.length, (match.index ?? 0) + 1200);
    const block = listHtml.slice(blockStart, blockEnd);
    const titleMatch = block.match(
      /<p[^>]*font-weight:bold[^>]*>([^<]+(?:<[^>]+>[^<]*)*?)<\/p>/i
    );
    const title = titleMatch ? stripTags(titleMatch[1]) : `${volcanoCode} bulletin`;

    entries.push({
      volcanoCode,
      bulletinId,
      title,
      detailPath,
    });
  }

  return entries;
}

export function parsePhivolcsBulletinHtml(
  html: string,
  entry: PhivolcsListEntry
): ParsedPhivolcsBulletin | null {
  const bulletinDate = extractInputValue(html, "bdate");
  const volcanoName =
    stripTags(html.match(/class="p-title">([^<]+)/i)?.[1] ?? "") ||
    entry.volcanoCode.toUpperCase();
  const alertLevelText = html.match(/class="circle">(\d+)/i)?.[1];
  const alertLevel = alertLevelText ? Number(alertLevelText) : NaN;
  const statusText = stripTags(html.match(/class="txt-status">([^<]+)/i)?.[1] ?? "");

  if (!bulletinDate || Number.isNaN(alertLevel)) {
    return null;
  }

  const parameters: Array<{ name: string; value: string }> = [];
  const paramPattern =
    /<tr>[\s\S]*?<b>([^<]+)<\/b>[\s\S]*?class="[^"]*newfont[^"]*">([\s\S]*?)<\/p>[\s\S]*?<\/tr>/gi;
  for (const match of html.matchAll(paramPattern)) {
    const name = stripTags(match[1]);
    const value = stripTags(match[2]);
    if (name && value) {
      parameters.push({ name, value });
    }
  }

  const recommendationBlock =
    html.match(/RECOMMENDATION\/COMMENT<\/p>([\s\S]*?)<\/table>/i)?.[1] ?? "";

  const prohibitedActions = [
    ...recommendationBlock.matchAll(/class="ul-bawal"[^>]*>[\s\S]*?<li>([^<]+)<\/li>/gi),
  ].map((match) => stripTags(match[1]));

  const hazards = [
    ...recommendationBlock.matchAll(/<ul>\s*([\s\S]*?)<\/ul>/gi),
  ].flatMap((match) =>
    [...match[1].matchAll(/<li>([^<]+)<\/li>/gi)].map((li) => stripTags(li[1]))
  );

  const reminders = hazards.length > 0 ? ["Possible hazards that can occur:"] : [];

  const locationText = stripTags(
    recommendationBlock.match(/Location of [^<]+<\/b>\s*([^<]+)/i)?.[1] ?? ""
  );

  return {
    volcanoCode: entry.volcanoCode,
    bulletinId: entry.bulletinId,
    volcanoName,
    title: entry.title,
    bulletinDate,
    alertLevel,
    statusText,
    parameters,
    prohibitedActions,
    reminders,
    hazards,
    locationText,
  };
}

export function inferPhivolcsHazardType(parsed: ParsedPhivolcsBulletin): HazardType {
  const text = [
    parsed.title,
    parsed.statusText,
    ...parsed.hazards,
    ...parsed.parameters.map((p) => `${p.name} ${p.value}`),
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("earthquake") || text.includes("seismic")) {
    return "EARTHQUAKE";
  }
  return "LANDSLIDE";
}

export function inferPhivolcsSeverity(
  alertLevel: number
): HazardBulletin["severity"] {
  if (alertLevel <= 0) return 1;
  if (alertLevel >= 5) return 5;
  return alertLevel as HazardBulletin["severity"];
}

export function bulletinValidityFromDate(bulletinDate: string): {
  issuedAt: string;
  validUntil: string;
} {
  const issued = new Date(`${bulletinDate}T00:00:00+08:00`);
  const validUntil = new Date(issued.getTime() + 24 * 60 * 60 * 1000);
  return {
    issuedAt: issued.toISOString(),
    validUntil: validUntil.toISOString(),
  };
}

export function buildPhivolcsRawText(parsed: ParsedPhivolcsBulletin): string {
  const lines: string[] = [
    parsed.title,
    `${parsed.volcanoName} — Alert Level ${parsed.alertLevel}`,
  ];

  if (parsed.statusText) {
    lines.push(parsed.statusText);
  }

  for (const parameter of parsed.parameters) {
    lines.push(`${parameter.name}: ${parameter.value}`);
  }

  if (parsed.prohibitedActions.length > 0) {
    lines.push("Should not be allowed:");
    for (const action of parsed.prohibitedActions) {
      lines.push(`- ${action}`);
    }
  }

  if (parsed.hazards.length > 0) {
    lines.push("Possible hazards that can occur:");
    for (const hazard of parsed.hazards) {
      lines.push(`- ${hazard}`);
    }
  }

  if (parsed.locationText) {
    lines.push(`Location: ${parsed.locationText}`);
  }

  return lines.join("\n").trim();
}

export function phivolcsBulletinId(volcanoCode: string): string {
  return `phivolcs-${volcanoCode.toLowerCase()}`;
}
