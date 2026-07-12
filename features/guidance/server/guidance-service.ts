import type {
  GuidancePhase,
  GuidanceRequest,
  GuidanceResponse,
  GuidanceResult,
  LanguageCode,
} from "@/features/shared/types";
import { SUPPORTED_LANGUAGES } from "@/features/shared/types";
import { getDataStore } from "@/lib/data";
import { generateBulletinGuidanceWithAI } from "@/lib/ai/claude-client";
import { validateGuidanceContent } from "@/lib/ai/content-filter";
import {
  generateMockGuidance,
  getGenericFallbackGuidance,
  getStaticHazardFallback,
} from "@/lib/ai/mock-guidance";

const PHASES: GuidancePhase[] = [
  "NOW",
  "NEXT_24H",
  "DURING_IMPACT",
  "AFTERMATH",
];

function normalizeLanguage(language: string): LanguageCode {
  if (SUPPORTED_LANGUAGES.includes(language as LanguageCode)) {
    return language as LanguageCode;
  }
  console.warn(`Unsupported language requested: ${language}, falling back to en`);
  return "en";
}

function formatAttribution(source: string, issuedAt: string): string {
  const date = new Date(issuedAt).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `Based on ${source} bulletin issued ${date}`;
}

async function buildGuidanceForBulletin(
  request: GuidanceRequest,
  bulletin: Awaited<ReturnType<typeof getDataStore>> extends infer _T
    ? import("@/features/shared/types").HazardBulletin
    : never
): Promise<GuidanceResponse[]> {
  const language = normalizeLanguage(request.language);
  const aiByPhase = await generateBulletinGuidanceWithAI({
    bulletin,
    location: request.location,
    language,
  });

  return PHASES.map((phase) => {
    const aiResult = aiByPhase[phase];
    let summary = aiResult.summary;
    let actionItems = aiResult.actionItems;
    let isFallback = aiResult.usedMock;

    if (!validateGuidanceContent(summary, actionItems)) {
      const staticFallback = getStaticHazardFallback(bulletin.hazardType, language);
      summary = staticFallback.summary;
      actionItems = staticFallback.actionItems;
      isFallback = true;
    }

    return {
      bulletinId: bulletin.id,
      generatedAt: new Date().toISOString(),
      language,
      phase,
      summary,
      actionItems,
      sourceAttribution: formatAttribution(bulletin.source, bulletin.issuedAt),
      isFallback,
      hazardType: bulletin.hazardType,
      severity: bulletin.severity,
    };
  });
}

export async function generateGuidance(
  request: GuidanceRequest
): Promise<GuidanceResult> {
  const store = getDataStore();
  const language = normalizeLanguage(request.language);
  const normalizedRequest = { ...request, language };

  const bulletins = await store.getActiveBulletinsForLocation(request.location);

  if (bulletins.length === 0) {
    const generic = getGenericFallbackGuidance(language);
    return {
      guidance: PHASES.map((phase) => ({
        bulletinId: "none",
        generatedAt: new Date().toISOString(),
        language,
        phase,
        summary: generic.summary,
        actionItems: generic.actionItems,
        sourceAttribution: "No active advisory for your location",
        isFallback: true,
      })),
    };
  }

  const allGuidance: GuidanceResponse[] = [];
  for (const bulletin of bulletins) {
    const guidance = await buildGuidanceForBulletin(normalizedRequest, bulletin);
    allGuidance.push(...guidance);
  }

  allGuidance.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));

  return { guidance: allGuidance };
}

export async function generateGuidanceForShare(
  guidanceResponseId: string
): Promise<GuidanceResponse | null> {
  if (guidanceResponseId.startsWith("fallback-")) {
    return null;
  }
  return null;
}

// Export for tests
export { generateMockGuidance, getGenericFallbackGuidance, getStaticHazardFallback };
