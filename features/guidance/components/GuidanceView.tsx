"use client";

import { useEffect, useState } from "react";
import type {
  GuidancePhase,
  GuidanceResponse,
  LanguageCode,
  LocationRef,
} from "@/features/shared/types";
import { LoadingSkeleton } from "@/features/shared/components/LoadingSkeleton";
import { ErrorState } from "@/features/shared/components/ErrorState";
import { Button } from "@/features/shared/components/Button";

const PHASES: GuidancePhase[] = [
  "NOW",
  "NEXT_24H",
  "DURING_IMPACT",
  "AFTERMATH",
];

const PHASE_LABELS: Record<GuidancePhase, string> = {
  NOW: "Right now",
  NEXT_24H: "Next 24 hours",
  DURING_IMPACT: "During impact",
  AFTERMATH: "Aftermath",
};

export function GuidanceView({
  location,
  language,
  isOnline,
  offlineChecklist,
}: {
  location: LocationRef;
  language: LanguageCode;
  isOnline: boolean;
  offlineChecklist?: string[];
}) {
  const [guidance, setGuidance] = useState<GuidanceResponse[]>([]);
  const [activePhase, setActivePhase] = useState<GuidancePhase>("NOW");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline && offlineChecklist) {
      setGuidance([
        {
          bulletinId: "offline",
          generatedAt: new Date().toISOString(),
          language,
          phase: "NOW",
          summary:
            "No active advisory available offline. Showing general preparedness checklist.",
          actionItems: offlineChecklist,
          sourceAttribution: "Offline cached content",
          isFallback: true,
        },
      ]);
      setLoading(false);
      return;
    }

    if (!isOnline) {
      setError("No cached guidance available. Connect to download content.");
      setLoading(false);
      return;
    }

    const fetchGuidance = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/guidance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location,
            language,
            requestedAt: new Date().toISOString(),
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to load guidance");
        }

        const data = await res.json();
        setGuidance(data.guidance ?? []);
      } catch {
        setError(
          "We could not load guidance right now. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchGuidance();
  }, [location, language, isOnline, offlineChecklist]);

  const phaseGuidance = guidance.filter((g) => g.phase === activePhase);
  const uniqueBulletins = Array.from(
    new Map(phaseGuidance.map((g) => [g.bulletinId, g])).values()
  );

  const handleShare = async (item: GuidanceResponse) => {
    setShareStatus(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guidanceResponseId: `${item.bulletinId}-${item.phase}`,
          summary: item.summary,
          locationName: `${location.barangayName}, ${location.cityMunicipality}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (navigator.share) {
          await navigator.share({ text: data.shareText, url: data.shareUrl });
        } else {
          await navigator.clipboard.writeText(data.shareText);
          setShareStatus("Link copied to clipboard.");
        }
      }
    } catch {
      setShareStatus("Could not share, but guidance is still available.");
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState title="Guidance unavailable" message={error} />;

  const noActiveAdvisory =
    guidance.length > 0 && guidance.every((g) => g.bulletinId === "none");

  return (
    <div className="space-y-4">
      {noActiveAdvisory && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          No active hazard advisory for your location right now.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PHASES.map((phase) => (
          <button
            key={phase}
            type="button"
            onClick={() => setActivePhase(phase)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              activePhase === phase
                ? "bg-blue-700 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      {uniqueBulletins.length === 0 ? (
        <p className="text-sm text-slate-600">
          No guidance available for this phase.
        </p>
      ) : (
        uniqueBulletins.map((item) => (
          <article
            key={`${item.bulletinId}-${item.phase}`}
            className={`rounded-lg border p-4 ${
              item.isFallback
                ? "border-amber-200 bg-amber-50"
                : "border-slate-200 bg-white"
            }`}
          >
            {item.isFallback && (
              <span className="mb-2 inline-block rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
                General / fallback guidance
              </span>
            )}
            <h3 className="text-lg font-semibold text-slate-900">
              {item.summary}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {item.sourceAttribution}
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
              {item.actionItems.map((action: string) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
            <div className="mt-3">
              <Button variant="secondary" onClick={() => handleShare(item)}>
                Share
              </Button>
            </div>
          </article>
        ))
      )}

      {shareStatus && (
        <p className="text-sm text-slate-600">{shareStatus}</p>
      )}
    </div>
  );
}
