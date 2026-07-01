import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";

export async function GET() {
  const store = getDataStore();
  const bundle = await store.getOfflineBundle();
  return NextResponse.json(bundle);
}
