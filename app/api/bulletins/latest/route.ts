import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";
import { getLocationByCode } from "@/lib/data/location-resolver";
import { bulletinsQuerySchema } from "@/lib/validation/schemas";
import { validationError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = bulletinsQuerySchema.safeParse(params);

  if (!parsed.success) {
    return validationError(
      parsed.error.issues[0]?.message ?? "Invalid query parameters"
    );
  }

  const store = getDataStore();

  if (parsed.data.barangayCode) {
    const location = getLocationByCode(parsed.data.barangayCode);
    if (!location) {
      return NextResponse.json({ bulletins: [] });
    }
    const bulletins = await store.getActiveBulletinsForLocation(location);
    return NextResponse.json({ bulletins });
  }

  return NextResponse.json({ bulletins: [] });
}
