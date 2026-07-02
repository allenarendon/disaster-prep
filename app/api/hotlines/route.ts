import { NextRequest, NextResponse } from "next/server";
import { resolveHotlinesByBarangayCode } from "@/features/hotlines/server/hotline-resolver";
import { hotlinesQuerySchema } from "@/lib/validation/schemas";
import { apiError, validationError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const params = {
    barangayCode: request.nextUrl.searchParams.get("barangayCode") ?? undefined,
  };
  const parsed = hotlinesQuerySchema.safeParse(params);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return validationError(
      issue?.message ?? "Invalid hotlines query",
      issue?.path.join(".")
    );
  }

  const result = resolveHotlinesByBarangayCode(parsed.data.barangayCode);
  if (!result) {
    return apiError(
      "NOT_FOUND",
      "No location found for the provided barangay code",
      404,
      false
    );
  }

  return NextResponse.json(result);
}
