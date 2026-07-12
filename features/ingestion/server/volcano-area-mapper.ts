import type { LocationRef } from "@/features/shared/types";

export interface VolcanoGeography {
  volcanoName: string;
  affectedAreas: LocationRef[];
}

const VOLCANO_GEOGRAPHY: Record<string, VolcanoGeography> = {
  mvo: {
    volcanoName: "Mayon",
    affectedAreas: [
      {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "Albay",
        region: "Region 05",
      },
    ],
  },
  tvo: {
    volcanoName: "Taal",
    affectedAreas: [
      {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "Batangas",
        region: "Region IV-A",
      },
      {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "Cavite",
        region: "Region IV-A",
      },
      {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "Laguna",
        region: "Region IV-A",
      },
    ],
  },
  kvo: {
    volcanoName: "Kanlaon",
    affectedAreas: [
      {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "Negros Occidental",
        region: "Region 06",
      },
      {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "Negros Oriental",
        region: "Region 07",
      },
    ],
  },
  bvo: {
    volcanoName: "Bulusan",
    affectedAreas: [
      {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "Sorsogon",
        region: "Region 05",
      },
    ],
  },
  pvo: {
    volcanoName: "Pinatubo",
    affectedAreas: [
      {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "Zambales",
        region: "Region 03",
      },
      {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "Tarlac",
        region: "Region 03",
      },
      {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "Pampanga",
        region: "Region 03",
      },
    ],
  },
  hvo: {
    volcanoName: "Hibok-Hibok",
    affectedAreas: [
      {
        barangayCode: "",
        barangayName: "",
        cityMunicipality: "",
        province: "Camiguin",
        region: "Region 10",
      },
    ],
  },
};

export function mapVolcanoCodeToLocationRefs(
  volcanoCode: string
): LocationRef[] {
  return VOLCANO_GEOGRAPHY[volcanoCode.toLowerCase()]?.affectedAreas ?? [];
}

export function volcanoNameFromCode(volcanoCode: string): string | undefined {
  return VOLCANO_GEOGRAPHY[volcanoCode.toLowerCase()]?.volcanoName;
}
