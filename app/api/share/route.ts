import { NextRequest, NextResponse } from "next/server";
import { shareRequestSchema } from "@/lib/validation/schemas";
import { apiError, validationError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = shareRequestSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(
        parsed.error.issues[0]?.message ?? "Invalid share request"
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const locationPart = parsed.data.locationName
      ? ` for ${parsed.data.locationName}`
      : "";
    const summaryPart = parsed.data.summary ?? "Check the latest disaster guidance";

    const shareText = `⚠️ Disaster Preparedness Alert${locationPart}\n\n${summaryPart}\n\nView details: ${appUrl}/?guidance=${parsed.data.guidanceResponseId}`;
    const shareUrl = `${appUrl}/?guidance=${parsed.data.guidanceResponseId}`;

    return NextResponse.json({
      guidanceResponseId: parsed.data.guidanceResponseId,
      shareText,
      shareUrl,
    });
  } catch {
    return apiError(
      "SHARE_ERROR",
      "Could not create share link. You can still view guidance in the app.",
      500,
      true
    );
  }
}
