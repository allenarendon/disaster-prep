import { NextRequest, NextResponse } from "next/server";
import { searchEvacCenters } from "@/features/evac-centers/server/evac-service";
import { evacCentersQuerySchema } from "@/lib/validation/schemas";
import { validationError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const params = {
    barangayCode: request.nextUrl.searchParams.get("barangayCode") ?? undefined,
    locationBarangayCode:
      request.nextUrl.searchParams.get("locationBarangayCode") ?? undefined,
    lat: request.nextUrl.searchParams.get("lat") ?? undefined,
    lng: request.nextUrl.searchParams.get("lng") ?? undefined,
    radiusKm: request.nextUrl.searchParams.get("radiusKm") ?? undefined,
  };
  const parsed = evacCentersQuerySchema.safeParse(params);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return validationError(
      issue?.message ?? "Invalid evacuation center query",
      issue?.path.join(".")
    );
  }

  const result = await searchEvacCenters(parsed.data);
  return NextResponse.json(result);
}
