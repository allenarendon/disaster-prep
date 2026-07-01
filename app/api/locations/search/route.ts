import { NextRequest, NextResponse } from "next/server";
import { searchLocations } from "@/lib/data/location-resolver";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const matches = searchLocations(query);
  return NextResponse.json({ matches, query });
}
