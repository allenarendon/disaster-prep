import type {
  GuidancePhase,
  HazardBulletin,
  LanguageCode,
  LocationRef,
} from "@/features/shared/types";
import { aiGuidanceOutputSchema } from "@/lib/validation/schemas";
import { generateMockGuidance } from "@/lib/ai/mock-guidance";

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  tl: "Tagalog",
  ceb: "Bisaya/Cebuano",
};

const TIMEOUT_MS = 5000;

export async function generateGuidanceWithAI(params: {
  bulletin: HazardBulletin;
  location: LocationRef;
  language: LanguageCode;
  phase: GuidancePhase;
}): Promise<{ summary: string; actionItems: string[]; usedMock: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const mock = generateMockGuidance(params);
    return { ...mock, usedMock: true };
  }

  const langName = LANGUAGE_NAMES[params.language];
  const place = `${params.location.barangayName}, ${params.location.cityMunicipality}, ${params.location.province}`;

  const prompt = `You are a disaster preparedness assistant for the Philippines. Convert the following official hazard bulletin into plain-language guidance for residents.

Location: ${place}
Phase: ${params.phase}
Language: Respond entirely in ${langName}.
Hazard type: ${params.bulletin.hazardType}
Severity (1-5): ${params.bulletin.severity}

Official bulletin text:
${params.bulletin.rawText}

Rules:
- Only use information grounded in the bulletin. Do not invent hazard details.
- Provide 3-5 short, imperative action items.
- No medical dosing advice.
- Respond with JSON only: {"summary": "...", "actionItems": ["...", "..."]}`;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await client.messages.create(
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response");
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = aiGuidanceOutputSchema.parse(JSON.parse(jsonMatch[0]));
    return { ...parsed, usedMock: false };
  } catch {
    const mock = generateMockGuidance(params);
    return { ...mock, usedMock: true };
  }
}
