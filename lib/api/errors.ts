import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/features/shared/types";

export function apiError(
  code: string,
  message: string,
  status: number,
  retryable = false,
  field?: string
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, retryable, ...(field ? { field } : {}) } },
    { status }
  );
}

export function validationError(
  message: string,
  field?: string
): NextResponse<ApiErrorBody> {
  return apiError("VALIDATION_ERROR", message, 400, false, field);
}
