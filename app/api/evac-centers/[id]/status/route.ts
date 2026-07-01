import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/lib/data";
import { verifyLguAdmin } from "@/lib/auth/lgu-admin";
import { evacStatusUpdateSchema } from "@/lib/validation/schemas";
import { apiError, validationError } from "@/lib/api/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifyLguAdmin(request)) {
    return apiError(
      "UNAUTHORIZED",
      "You are not authorized to update evacuation center status.",
      401
    );
  }

  const body = await request.json();
  const parsed = evacStatusUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(
      parsed.error.issues[0]?.message ?? "Invalid status update",
      parsed.error.issues[0]?.path.join(".")
    );
  }

  const store = getDataStore();
  const updated = await store.updateEvacCenterStatus(
    params.id,
    parsed.data.status,
    parsed.data.updatedBy
  );

  if (!updated) {
    return apiError(
      "NOT_FOUND",
      "Evacuation center not found.",
      404
    );
  }

  return NextResponse.json(updated);
}
