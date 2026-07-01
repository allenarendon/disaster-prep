import { NextRequest, NextResponse } from "next/server";
import { generateGuidance } from "@/features/guidance/server/guidance-service";
import { guidanceRequestSchema } from "@/lib/validation/schemas";
import { apiError, validationError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = guidanceRequestSchema.safeParse(body);

    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path.join(".") || undefined;
      return validationError(
        parsed.error.issues[0]?.message ?? "Invalid guidance request",
        field
      );
    }

    const result = await generateGuidance(parsed.data);
    return NextResponse.json(result);
  } catch {
    return apiError(
      "GUIDANCE_ERROR",
      "We could not generate guidance right now. Please try again.",
      500,
      true
    );
  }
}
