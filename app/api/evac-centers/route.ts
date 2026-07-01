import { NextRequest, NextResponse } from "next/server";
import { searchEvacCenters } from "@/features/evac-centers/server/evac-service";
import { validationError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const barangayCode = params.get("barangayCode");
  const lat = params.get("lat");
  const lng = params.get("lng");
  const radiusKm = params.get("radiusKm");

  if (barangayCode) {
    const result = await searchEvacCenters({ barangayCode });
    return NextResponse.json(result);
  }

  if (lat && lng) {
    const result = await searchEvacCenters({
      lat: Number(lat),
      lng: Number(lng),
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
    });
    return NextResponse.json(result);
  }

  return validationError(
    "Provide either barangayCode or lat and lng query parameters"
  );
}
