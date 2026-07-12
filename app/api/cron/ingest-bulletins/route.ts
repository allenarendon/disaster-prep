import { NextRequest, NextResponse } from "next/server";
import { ingestPagasaCapBulletins } from "@/features/ingestion/server/pagasa-ingest-service";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

function getAcceptedCronSecrets(): string[] {
  return [process.env.CRON_SECRET, process.env.INGEST_CRON_SECRET].filter(
    (value): value is string => Boolean(value?.trim())
  );
}

function isAuthorized(request: NextRequest): boolean {
  const secrets = getAcceptedCronSecrets();
  if (secrets.length === 0) return false;

  const header = request.headers.get("authorization");
  return secrets.some((secret) => header === `Bearer ${secret}`);
}

async function runIngestion() {
  const result = await ingestPagasaCapBulletins();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return apiError("UNAUTHORIZED", "Ingestion is not authorized.", 401, false);
  }

  try {
    return await runIngestion();
  } catch (error) {
    return apiError(
      "INGEST_ERROR",
      error instanceof Error
        ? error.message
        : "Bulletin ingestion failed. Try again later.",
      500,
      true
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return apiError("UNAUTHORIZED", "Ingestion is not authorized.", 401, false);
  }

  try {
    return await runIngestion();
  } catch (error) {
    return apiError(
      "INGEST_ERROR",
      error instanceof Error
        ? error.message
        : "Bulletin ingestion failed. Try again later.",
      500,
      true
    );
  }
}
