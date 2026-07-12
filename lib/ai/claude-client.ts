import type {
  GuidancePhase,
  HazardBulletin,
  LanguageCode,
  LocationRef,
} from "@/features/shared/types";
import { aiGuidanceByPhaseSchema } from "@/lib/validation/schemas";
import { generateMockGuidance } from "@/lib/ai/mock-guidance";

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  tl: "Tagalog",
  ceb: "Bisaya/Cebuano",
};

const PHASES: GuidancePhase[] = [
  "NOW",
  "NEXT_24H",
  "DURING_IMPACT",
  "AFTERMATH",
];

const TIMEOUT_MS = 12_000;

const MODEL_FALLBACKS = [
  "claude-haiku-4-5",
  "claude-sonnet-4-5",
  "claude-sonnet-4-5-20250929",
] as const;

function getModelCandidates(): string[] {
  const configured = process.env.ANTHROPIC_MODEL?.trim();
  if (!configured) return [...MODEL_FALLBACKS];
  return [configured, ...MODEL_FALLBACKS.filter((model) => model !== configured)];
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("AI guidance timeout")), ms);
    }),
  ]);
}

function parseAiJsonResponse(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  const jsonMatch = candidate.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON in response");
  }
  return JSON.parse(jsonMatch[0]);
}

async function createGuidanceMessage(
  client: import("@anthropic-ai/sdk").default,
  prompt: string
) {
  let lastError: unknown;

  for (const model of getModelCandidates()) {
    try {
      return await withTimeout(
        client.messages.create({
          model,
          max_tokens: 1200,
          messages: [{ role: "user", content: prompt }],
        }),
        TIMEOUT_MS
      );
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number }).status;
      if (status === 404) continue;
      throw error;
    }
  }

  throw lastError ?? new Error("No Anthropic model available");
}

function mockGuidanceForAllPhases(params: {
  bulletin: HazardBulletin;
  location: LocationRef;
  language: LanguageCode;
}): Record<
  GuidancePhase,
  { summary: string; actionItems: string[]; usedMock: true }
> {
  return Object.fromEntries(
    PHASES.map((phase) => [
      phase,
      { ...generateMockGuidance({ ...params, phase }), usedMock: true as const },
    ])
  ) as Record<
    GuidancePhase,
    { summary: string; actionItems: string[]; usedMock: true }
  >;
}

export async function generateBulletinGuidanceWithAI(params: {
  bulletin: HazardBulletin;
  location: LocationRef;
  language: LanguageCode;
}): Promise<
  Record<
    GuidancePhase,
    { summary: string; actionItems: string[]; usedMock: boolean }
  >
> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return mockGuidanceForAllPhases(params);
  }

  const langName = LANGUAGE_NAMES[params.language];
  const place = `${params.location.barangayName}, ${params.location.cityMunicipality}, ${params.location.province}`;

  const prompt = `You are a disaster preparedness assistant for the Philippines. Convert the following official hazard bulletin into plain-language guidance for residents.

Location: ${place}
Language: Respond entirely in ${langName}.
Hazard type: ${params.bulletin.hazardType}
Severity (1-5): ${params.bulletin.severity}

Official bulletin text:
${params.bulletin.rawText}

Rules:
- Only use information explicitly stated in the bulletin. Do not invent hazard details.
- Do not name storms, signal numbers, wind speeds, rainfall amounts, or evacuation orders unless they appear in the bulletin text.
- If the bulletin does not describe an active threat for this location, say there is no active advisory and give general preparedness tips only.
- Provide separate guidance for each phase: NOW, NEXT_24H, DURING_IMPACT, AFTERMATH.
- Each phase needs 3-5 short, imperative action items.
- No medical dosing advice.
- Respond with JSON only:
{
  "NOW": {"summary": "...", "actionItems": ["...", "..."]},
  "NEXT_24H": {"summary": "...", "actionItems": ["...", "..."]},
  "DURING_IMPACT": {"summary": "...", "actionItems": ["...", "..."]},
  "AFTERMATH": {"summary": "...", "actionItems": ["...", "..."]}
}`;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const response = await createGuidanceMessage(client, prompt);

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response");
    }

    const parsed = aiGuidanceByPhaseSchema.parse(
      parseAiJsonResponse(textBlock.text)
    );

    return Object.fromEntries(
      PHASES.map((phase) => [
        phase,
        { ...parsed[phase], usedMock: false },
      ])
    ) as Record<
      GuidancePhase,
      { summary: string; actionItems: string[]; usedMock: boolean }
    >;
  } catch (error) {
    console.error("AI guidance generation failed:", error);
    return mockGuidanceForAllPhases(params);
  }
}

// Kept for compatibility with single-phase callers/tests.
export async function generateGuidanceWithAI(params: {
  bulletin: HazardBulletin;
  location: LocationRef;
  language: LanguageCode;
  phase: GuidancePhase;
}): Promise<{ summary: string; actionItems: string[]; usedMock: boolean }> {
  const allPhases = await generateBulletinGuidanceWithAI(params);
  return allPhases[params.phase];
}
