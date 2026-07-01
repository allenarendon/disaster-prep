import type { CommunityReportInput } from "@/features/shared/types";
import { getDataStore } from "@/lib/data";
import {
  isAmbiguousContent,
  isObviouslyAbusive,
} from "@/lib/ai/content-filter";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export interface ReportSubmissionResult {
  id: string;
  accepted: boolean;
  needsReview?: boolean;
}

export async function submitCommunityReport(
  input: CommunityReportInput
): Promise<
  | { ok: true; result: ReportSubmissionResult }
  | { ok: false; code: string; message: string; field?: string }
> {
  const store = getDataStore();
  const sinceIso = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const count = await store.countReportsByClientHash(input.clientHash, sinceIso);

  if (count >= RATE_LIMIT) {
    return {
      ok: false,
      code: "RATE_LIMIT_EXCEEDED",
      message: "You have submitted too many reports. Please wait before submitting again.",
    };
  }

  if (isObviouslyAbusive(input.message)) {
    return {
      ok: false,
      code: "CONTENT_REJECTED",
      message: "This report could not be accepted. Please use respectful language.",
    };
  }

  const needsReview = isAmbiguousContent(input.message);

  const report = await store.createReport({
    ...input,
    needsReview,
  });

  return {
    ok: true,
    result: {
      id: report.id,
      accepted: true,
      needsReview,
    },
  };
}
