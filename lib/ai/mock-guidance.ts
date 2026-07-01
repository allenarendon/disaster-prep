import type {
  GuidancePhase,
  HazardBulletin,
  HazardType,
  LanguageCode,
  LocationRef,
} from "@/features/shared/types";

const PHASE_LABELS: Record<LanguageCode, Record<GuidancePhase, string>> = {
  en: {
    NOW: "Right now",
    NEXT_24H: "In the next 24 hours",
    DURING_IMPACT: "During the impact",
    AFTERMATH: "After the hazard passes",
  },
  tl: {
    NOW: "Ngayon",
    NEXT_24H: "Sa susunod na 24 oras",
    DURING_IMPACT: "Habang tumatama ang sakuna",
    AFTERMATH: "Pagkatapos ng sakuna",
  },
  ceb: {
    NOW: "Karon",
    NEXT_24H: "Sa sunod nga 24 oras",
    DURING_IMPACT: "Samtang moigo ang katalagman",
    AFTERMATH: "Human sa katalagman",
  },
};

function hazardLabel(type: HazardType, lang: LanguageCode): string {
  const labels: Record<LanguageCode, Record<HazardType, string>> = {
    en: {
      TYPHOON: "typhoon",
      FLOOD: "flood",
      STORM_SURGE: "storm surge",
      LANDSLIDE: "landslide",
      EARTHQUAKE: "earthquake",
    },
    tl: {
      TYPHOON: "bagyo",
      FLOOD: "baha",
      STORM_SURGE: "storm surge",
      LANDSLIDE: "guho",
      EARTHQUAKE: "lindol",
    },
    ceb: {
      TYPHOON: "bagyo",
      FLOOD: "baha",
      STORM_SURGE: "storm surge",
      LANDSLIDE: "ragasa",
      EARTHQUAKE: "linog",
    },
  };
  return labels[lang][type];
}

export function generateMockGuidance(params: {
  bulletin: HazardBulletin;
  location: LocationRef;
  language: LanguageCode;
  phase: GuidancePhase;
}): { summary: string; actionItems: string[] } {
  const { bulletin, location, language, phase } = params;
  const hazard = hazardLabel(bulletin.hazardType, language);
  const phaseLabel = PHASE_LABELS[language][phase];
  const place = `${location.barangayName}, ${location.cityMunicipality}`;

  const templates: Record<LanguageCode, { summary: string; actions: string[] }> = {
    en: {
      summary: `${phaseLabel}: A ${hazard} advisory (severity ${bulletin.severity}/5) applies to ${place}. Follow official guidance and stay alert.`,
      actions: [
        "Monitor official PAGASA/PHIVOLCS bulletins for updates",
        "Prepare your go-bag with essentials if you have not already",
        "Know your nearest evacuation center and route",
        bulletin.severity >= 3
          ? "Be ready to evacuate if ordered by local authorities"
          : "Stay informed and limit non-essential travel",
        "Check on family members and neighbors who may need help",
      ],
    },
    tl: {
      summary: `${phaseLabel}: May abiso para sa ${hazard} (gravity ${bulletin.severity}/5) na naaapektuhan ang ${place}. Sundin ang opisyal na gabay at manatiling alerto.`,
      actions: [
        "Subaybayan ang opisyal na bulletin ng PAGASA/PHIVOLCS",
        "Ihanda ang go-bag kung hindi pa nagagawa",
        "Alamin ang pinakamalapit na evacuation center at ruta",
        bulletin.severity >= 3
          ? "Maging handang lumikas kung inutos ng lokal na awtoridad"
          : "Manatiling updated at iwasan ang hindi kinakailangang paglabas",
        "Alamin ang kalagayan ng pamilya at kapitbahay na nangangailangan ng tulong",
      ],
    },
    ceb: {
      summary: `${phaseLabel}: Adunay abiso alang sa ${hazard} (severity ${bulletin.severity}/5) nga nakaapekto sa ${place}. Sunda ang opisyal nga giya ug pabilin nga alerto.`,
      actions: [
        "Subaya ang opisyal nga bulletin sa PAGASA/PHIVOLCS",
        "Andama ang go-bag kung wala pa",
        "Ilha ang pinakaduol nga evacuation center ug ruta",
        bulletin.severity >= 3
          ? "Andam nga mo-evacuate kung gisugo sa lokal nga awtoridad"
          : "Pabilin nga updated ug likayi ang dili kinahanglan nga pag-gawas",
        "Susiha ang pamilya ug silingan nga nanginahanglan og tabang",
      ],
    },
  };

  const t = templates[language];
  return { summary: t.summary, actionItems: t.actions };
}

export function getGenericFallbackGuidance(
  language: LanguageCode
): { summary: string; actionItems: string[] } {
  const content: Record<LanguageCode, { summary: string; actionItems: string[] }> = {
    en: {
      summary:
        "No active hazard advisory applies to your location right now. Here is general preparedness guidance.",
      actionItems: [
        "Stay informed through official PAGASA and local DRRM channels",
        "Keep a go-bag ready with water, food, and medicines",
        "Identify your nearest evacuation center before an emergency",
        "Know safe routes to higher ground from your home",
      ],
    },
    tl: {
      summary:
        "Walang aktibong abiso sa sakuna para sa inyong lokasyon ngayon. Narito ang pangkalahatang gabay sa paghahanda.",
      actionItems: [
        "Manatiling updated sa opisyal na PAGASA at lokal na DRRM",
        "Maghanda ng go-bag na may tubig, pagkain, at gamot",
        "Alamin ang pinakamalapit na evacuation center bago dumating ang emergency",
        "Alamin ang ligtas na ruta papunta sa mataas na lugar",
      ],
    },
    ceb: {
      summary:
        "Walay aktibong abiso sa katalagman para sa inyong lokasyon karon. Ania ang kinatibuk-ang giya sa pag-andam.",
      actionItems: [
        "Pabilin nga updated sa opisyal nga PAGASA ug lokal nga DRRM",
        "Andama ang go-bag nga may tubig, pagkaon, ug tambal",
        "Ilha ang pinakaduol nga evacuation center sa dili pa moabot ang emergency",
        "Ilha ang luwas nga ruta padulong sa habog nga lugar",
      ],
    },
  };
  return content[language];
}

export function getStaticHazardFallback(
  hazardType: HazardType,
  language: LanguageCode
): { summary: string; actionItems: string[] } {
  const offlineKey =
    hazardType === "EARTHQUAKE" ? "LANDSLIDE" : hazardType;

  const actionsByHazard: Record<string, Record<LanguageCode, string[]>> = {
    TYPHOON: {
      en: [
        "Stay indoors away from windows during strong winds",
        "Secure loose outdoor items",
        "Monitor PAGASA for signal changes",
        "Evacuate if ordered by authorities",
      ],
      tl: [
        "Manatili sa loob at lumayo sa bintana",
        "I-secure ang mga bagay sa labas",
        "Subaybayan ang PAGASA para sa pagbabago ng signal",
        "Lumikas kung inutos ng awtoridad",
      ],
      ceb: [
        "Pabilin sa sulod ug layo sa bintana",
        "I-secure ang mga butang sa gawas",
        "Subaya ang PAGASA alang sa pagbag-o sa signal",
        "Evacuate kung gisugo sa awtoridad",
      ],
    },
    FLOOD: {
      en: [
        "Move to higher ground if water rises",
        "Do not walk or drive through floods",
        "Turn off electricity if water enters your home",
      ],
      tl: [
        "Lumipat sa mataas na lugar kung tumataas ang tubig",
        "Huwag dumaan sa baha",
        "Patayin ang kuryente kung may tubig sa bahay",
      ],
      ceb: [
        "Balhin sa habog nga lugar kung mosaka ang tubig",
        "Ayaw agi sa baha",
        "Patya ang kuryente kung naay tubig sa balay",
      ],
    },
    STORM_SURGE: {
      en: [
        "Evacuate coastal areas immediately when advised",
        "Go to designated evacuation centers",
        "Do not return until authorities say it is safe",
      ],
      tl: [
        "Lumikas agad sa coastal areas kapag pinayuhan",
        "Pumunta sa itinalagang evacuation centers",
        "Huwag bumalik hanggang ligtas na ayon sa awtoridad",
      ],
      ceb: [
        "Evacuate dayon sa coastal areas kung gitambagan",
        "Adto sa gitudlo nga evacuation centers",
        "Ayaw pagbalik hangtod luwas na ayon sa awtoridad",
      ],
    },
    LANDSLIDE: {
      en: [
        "Evacuate slopes during prolonged heavy rain",
        "Watch for ground cracks or tilting trees",
        "Follow PHIVOLCS advisories",
      ],
      tl: [
        "Lumikas sa dalisdis kapag matagal ang malakas na ulan",
        "Bantayan ang bitak sa lupa o tumutuwid na puno",
        "Sundin ang abiso ng PHIVOLCS",
      ],
      ceb: [
        "Evacuate sa dalisdis kung dugay ang kusog nga ulan",
        "Bantayi ang bitak sa yuta o nakatagilid nga kahoy",
        "Sunda ang abiso sa PHIVOLCS",
      ],
    },
  };

  const actions =
    actionsByHazard[offlineKey]?.[language] ??
    actionsByHazard.LANDSLIDE[language];

  const hazard = hazardLabel(hazardType, language);
  const summaryMap: Record<LanguageCode, string> = {
    en: `Static fallback guidance for ${hazard}. AI personalization is temporarily unavailable.`,
    tl: `Static na gabay para sa ${hazard}. Pansamantalang hindi available ang AI personalization.`,
    ceb: `Static nga giya alang sa ${hazard}. Pansamantalang dili available ang AI personalization.`,
  };

  return { summary: summaryMap[language], actionItems: actions };
}
