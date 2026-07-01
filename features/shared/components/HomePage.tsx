"use client";

import { useState } from "react";
import type { LocationRef } from "@/features/shared/types";
import {
  LanguageSelector,
  useLanguagePreference,
} from "@/features/shared/components/LanguageSelector";
import { LocationPicker } from "@/features/shared/components/LocationPicker";
import { GuidanceView } from "@/features/guidance/components/GuidanceView";
import { EvacCentersPanel } from "@/features/evac-centers/components/EvacCentersPanel";
import { ReportForm } from "@/features/reports/components/ReportForm";
import {
  FirstTimeOfflineState,
  OfflineBanner,
} from "@/features/offline/components/OfflineBanner";
import { useOfflineStatus } from "@/features/offline/hooks/useOfflineStatus";

type Tab = "guidance" | "evac" | "report";

export function HomePage() {
  const [language, setLanguage] = useLanguagePreference();
  const [location, setLocation] = useState<LocationRef | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("guidance");
  const { isOnline, bundle, hasCachedBundle, isStale } = useOfflineStatus();

  if (!isOnline && hasCachedBundle === false) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <FirstTimeOfflineState />
      </div>
    );
  }

  const offlineChecklist = bundle?.staticChecklists[language];
  const offlineCenters = bundle?.lastKnownEvacCenters;

  return (
    <div>
      {!isOnline && (
        <OfflineBanner
          generatedAt={bundle?.generatedAt}
          isStale={isStale}
        />
      )}

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <header className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Disaster Preparedness Guide
            </h1>
            <p className="text-sm text-slate-600">
              Plain-language guidance and evacuation centers for the Philippines
            </p>
          </div>
          <LanguageSelector value={language} onChange={setLanguage} />
          <LocationPicker
            value={location}
            onChange={(loc) => setLocation(loc)}
          />
        </header>

        {!location ? (
          <p className="text-sm text-slate-600">
            Select your barangay to see hazard guidance and nearby evacuation
            centers.
          </p>
        ) : (
          <>
            <nav className="flex gap-2 border-b border-slate-200">
              {(
                [
                  ["guidance", "Guidance"],
                  ["evac", "Evacuation centers"],
                  ["report", "Community report"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`border-b-2 px-3 py-2 text-sm font-medium ${
                    activeTab === id
                      ? "border-blue-700 text-blue-700"
                      : "border-transparent text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            {activeTab === "guidance" && (
              <GuidanceView
                location={location}
                language={language}
                isOnline={isOnline}
                offlineChecklist={offlineChecklist}
              />
            )}
            {activeTab === "evac" && (
              <EvacCentersPanel
                location={location}
                isOnline={isOnline}
                offlineCenters={offlineCenters}
              />
            )}
            {activeTab === "report" && <ReportForm location={location} />}
          </>
        )}
      </div>
    </div>
  );
}
