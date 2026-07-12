import type { LocationRef } from "@/features/shared/types";

const REGION_ALIASES: Record<string, { region: string; province?: string }> = {
  ncr: { region: "NCR", province: "Metro Manila" },
  "national capital region": { region: "NCR", province: "Metro Manila" },
  "metro manila": { region: "NCR", province: "Metro Manila" },
  car: { region: "CAR" },
  "cordillera administrative region": { region: "CAR" },
  "region 1": { region: "Region 01" },
  "ilocos region": { region: "Region 01" },
  "region 2": { region: "Region 02" },
  "cagayan valley": { region: "Region 02" },
  "region 3": { region: "Region 03" },
  "central luzon": { region: "Region 03" },
  "region 4-a": { region: "Region IV-A" },
  calabarzon: { region: "Region IV-A" },
  "region 4-b": { region: "Region 17" },
  mimaropa: { region: "Region 17" },
  "region 5": { region: "Region 05" },
  "bicol region": { region: "Region 05" },
  "region 6": { region: "Region 06" },
  "western visayas": { region: "Region 06" },
  "region 7": { region: "Region 07" },
  "central visayas": { region: "Region 07" },
  "region 8": { region: "Region 08" },
  "eastern visayas": { region: "Region 08" },
  "region 9": { region: "Region 09" },
  "zamboanga peninsula": { region: "Region 09" },
  "region 10": { region: "Region 10" },
  "northern mindanao": { region: "Region 10" },
  "region 11": { region: "Region 11" },
  "davao region": { region: "Region 11" },
  "region 12": { region: "Region 12" },
  soccsksargen: { region: "Region 12" },
  "region 13": { region: "Region 13" },
  caraga: { region: "Region 13" },
  barmm: { region: "BARMM" },
  armm: { region: "BARMM" },
};

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function provinceLevelRef(
  province: string,
  region: string
): LocationRef {
  return {
    barangayCode: "",
    barangayName: "",
    cityMunicipality: "",
    province,
    region,
  };
}

function regionLevelRef(region: string): LocationRef {
  return {
    barangayCode: "",
    barangayName: "",
    cityMunicipality: "",
    province: "",
    region,
  };
}

function resolveAlias(text: string): LocationRef | undefined {
  const key = normalize(text);
  const direct = REGION_ALIASES[key];
  if (direct) {
    if (direct.province) {
      return provinceLevelRef(direct.province, direct.region);
    }
    return regionLevelRef(direct.region);
  }

  const regionMatch = key.match(/region\s*(\d{1,2}(?:-[ab])?)/i);
  if (regionMatch) {
    const token = `region ${regionMatch[1].toLowerCase()}`;
    const alias = REGION_ALIASES[token];
    if (alias) {
      return alias.province
        ? provinceLevelRef(alias.province, alias.region)
        : regionLevelRef(alias.region);
    }
  }

  const parenRegion = text.match(/\(([^)]+)\)/)?.[1];
  if (parenRegion) {
    return resolveAlias(parenRegion);
  }

  return undefined;
}

export function mapCapAreasToLocationRefs(params: {
  areaDescriptions: string[];
  regionParameter?: string;
  feedTitle: string;
}): LocationRef[] {
  const candidates = [
    ...params.areaDescriptions,
    params.regionParameter ?? "",
    params.feedTitle.split(" - ").slice(1).join(" - "),
  ].filter(Boolean);

  const refs: LocationRef[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const resolved = resolveAlias(candidate);
    if (!resolved) continue;
    const key = `${resolved.region}|${resolved.province}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(resolved);
  }

  return refs;
}
