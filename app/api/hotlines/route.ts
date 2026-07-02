import { NextRequest, NextResponse } from "next/server";
import { resolveHotlinesByBarangayCode } from "@/features/hotlines/server/hotline-resolver";
import { apiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const barangayCode = request.nextUrl.searchParams.get("barangayCode");

  if (!barangayCode) {
    return apiError(
      "VALIDATION_ERROR",
      "barangayCode query parameter is required",
      400,
      false,
      "barangayCode"
    );
  }

  const result = resolveHotlinesByBarangayCode(barangayCode);
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
