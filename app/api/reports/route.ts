import { NextRequest, NextResponse } from "next/server";
import { submitCommunityReport } from "@/features/reports/server/report-service";
import { communityReportInputSchema } from "@/lib/validation/schemas";
import { apiError, validationError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = communityReportInputSchema.safeParse(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return validationError(
      issue?.message ?? "Invalid report",
      issue?.path.join(".")
    );
  }

  const result = await submitCommunityReport(parsed.data);

  if (!result.ok) {
    const status = result.code === "RATE_LIMIT_EXCEEDED" ? 429 : 400;
    return apiError(result.code, result.message, status, status === 429);
  }

  return NextResponse.json(result.result);
}
