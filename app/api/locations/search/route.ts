import { NextRequest, NextResponse } from "next/server";
import {
  searchLocationsWithCoverage,
  toLocationSearchMatches,
} from "@/lib/data/location-resolver";
import { locationsSearchQuerySchema } from "@/lib/validation/schemas";
import { validationError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const params = {
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  };
  const parsed = locationsSearchQuerySchema.safeParse(params);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return validationError(
      issue?.message ?? "Invalid location search query",
      issue?.path.join(".")
    );
  }

  const { q: query, limit } = parsed.data;
  const matches = toLocationSearchMatches(
    searchLocationsWithCoverage(query, limit)
  );
  return NextResponse.json({ matches, query });
}
