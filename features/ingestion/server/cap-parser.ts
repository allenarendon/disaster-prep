import type { HazardBulletin, HazardType, LocationRef } from "@/features/shared/types";

export const PAGASA_CAP_FEED_URL =
  "https://publicalert.pagasa.dost.gov.ph/feeds/";

export interface CapFeedEntry {
  id: string;
  title: string;
  updated: string;
  capUrl: string;
}

export interface ParsedCapAlert {
  identifier: string;
  sent: string;
  expires: string;
  event: string;
  headline: string;
  description: string;
  instruction: string;
  areaDescriptions: string[];
  regionParameter?: string;
  isCancellation: boolean;
  isFinal: boolean;
}

export interface IngestedBulletinDraft {
  id: string;
  source: "PAGASA";
  hazardType: HazardType;
  issuedAt: string;
  validUntil: string;
  affectedAreas: LocationRef[];
  severity: HazardBulletin["severity"];
  rawText: string;
  feedTitle: string;
  shouldExpire: boolean;
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function extractXmlTag(xml: string, tag: string): string | undefined {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(pattern);
  if (!match) return undefined;
  return decodeXml(match[1].trim());
}

export function extractXmlTags(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  return [...xml.matchAll(pattern)].map((match) => decodeXml(match[1].trim()));
}

export function parseCapFeedEntries(atomXml: string): CapFeedEntry[] {
  const entries = [...atomXml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
  const parsed: CapFeedEntry[] = [];

  for (const entry of entries) {
    const block = entry[1];
    const id = extractXmlTag(block, "id");
    const title = extractXmlTag(block, "title");
    const updated = extractXmlTag(block, "updated");
    const capLink = block.match(
      /<link[^>]+type="application\/cap\+xml"[^>]+href="([^"]+)"/i
    );
    if (!id || !title || !capLink?.[1]) continue;
    parsed.push({
      id,
      title,
      updated: updated ?? "",
      capUrl: capLink[1],
    });
  }

  return parsed;
}

export function parseCapAlertXml(capXml: string, feedTitle: string): ParsedCapAlert | null {
  const identifier = extractXmlTag(capXml, "identifier");
  const sent = extractXmlTag(capXml, "sent");
  const expires = extractXmlTag(capXml, "expires");
  const event = extractXmlTag(capXml, "event");
  const headline = extractXmlTag(capXml, "headline");
  const description = extractXmlTag(capXml, "description");
  const instruction = extractXmlTag(capXml, "instruction");

  if (!identifier || !sent || !event || !description) {
    return null;
  }

  const areaDescriptions = extractXmlTags(capXml, "areaDesc");
  const regionParameter = capXml
    .match(/<valueName>layer:Google:Region:[^<]*<\/valueName>\s*<value>([^<]+)<\/value>/i)?.[1]
    ?.trim();

  const titleLower = feedTitle.toLowerCase();
  const isCancellation =
    titleLower.includes("cancellation") || event.toLowerCase().includes("cancel");
  const isFinal = titleLower.includes("(final)");

  return {
    identifier,
    sent,
    expires: expires ?? sent,
    event,
    headline: headline ?? event,
    description,
    instruction: instruction ?? "",
    areaDescriptions,
    regionParameter,
    isCancellation,
    isFinal,
  };
}

export function inferHazardType(event: string, title: string): HazardType {
  const text = `${event} ${title}`.toLowerCase();
  if (text.includes("tropical cyclone") || text.includes("typhoon") || text.includes("signal #")) {
    return "TYPHOON";
  }
  if (text.includes("storm surge")) return "STORM_SURGE";
  if (text.includes("landslide")) return "LANDSLIDE";
  if (text.includes("earthquake") || text.includes("tsunami")) return "EARTHQUAKE";
  return "FLOOD";
}

export function inferSeverity(event: string, title: string): HazardBulletin["severity"] {
  const signal = title.match(/signal\s*#\s*(\d)/i) ?? event.match(/signal\s*#\s*(\d)/i);
  if (signal) {
    const level = Number(signal[1]);
    if (level >= 1 && level <= 5) return level as HazardBulletin["severity"];
  }

  const text = `${event} ${title}`.toLowerCase();
  if (text.includes("extreme")) return 5;
  if (text.includes("severe")) return 4;
  if (text.includes("moderate")) return 3;
  if (text.includes("minor")) return 2;
  return 2;
}

export function toUtcIso(timestamp: string): string {
  return new Date(timestamp).toISOString();
}

export function buildRawText(alert: ParsedCapAlert): string {
  const parts = [
    alert.headline,
    alert.description,
    alert.instruction,
  ].filter(Boolean);
  return parts.join("\n\n").replace(/\*\*/g, "").trim();
}

export function bulletinIdFromCap(identifier: string): string {
  return `pagasa-cap-${identifier}`;
}
