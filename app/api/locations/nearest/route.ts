import { NextRequest, NextResponse } from "next/server";
import { findNearestLocation } from "@/lib/data/location-resolver";
import { locationsNearestQuerySchema } from "@/lib/validation/schemas";
import { validationError } from "@/lib/api/errors";

const MAX_ASSIGN_DISTANCE_KM = 50;

export async function GET(request: NextRequest) {
  const params = {
    lat: request.nextUrl.searchParams.get("lat") ?? undefined,
    lng: request.nextUrl.searchParams.get("lng") ?? undefined,
  };
  const parsed = locationsNearestQuerySchema.safeParse(params);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return validationError(
      issue?.message ?? "Invalid nearest-location query",
      issue?.path.join(".")
    );
  }

  const nearest = findNearestLocation(parsed.data.lat, parsed.data.lng);
  if (!nearest.location || nearest.distanceKm > MAX_ASSIGN_DISTANCE_KM) {
    return NextResponse.json({
      location: null,
      distanceKm: nearest.distanceKm,
      assigned: false,
    });
  }

  return NextResponse.json({
    location: nearest.location,
    distanceKm: nearest.distanceKm,
    assigned: true,
  });
}
