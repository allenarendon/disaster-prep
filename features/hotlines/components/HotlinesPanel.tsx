"use client";

import { useEffect, useState } from "react";
import type { HotlinesResponse, LocationRef } from "@/features/shared/types";
import { LoadingSkeleton } from "@/features/shared/components/LoadingSkeleton";
import { ErrorState } from "@/features/shared/components/ErrorState";

const NATIONAL_FALLBACK: HotlinesResponse["hotlines"] = [
  {
    category: "EMERGENCY",
    label: "National Emergency Hotline",
    number: "911",
    scope: "national",
  },
  {
    category: "POLICE",
    label: "Philippine National Police (PNP)",
    number: "117",
    scope: "national",
  },
  {
    category: "FIRE",
    label: "Bureau of Fire Protection (BFP)",
    number: "160",
    scope: "national",
  },
  {
    category: "MEDICAL",
    label: "Philippine Red Cross",
    number: "143",
    scope: "national",
  },
];

const CATEGORY_LABELS: Record<HotlinesResponse["hotlines"][number]["category"], string> = {
  EMERGENCY: "Emergency",
  POLICE: "Police",
  FIRE: "Fire",
  DRRM: "DRRM",
  BARANGAY: "Barangay",
  MEDICAL: "Medical",
  OTHER: "Other",
};

function formatTelHref(number: string): string {
  const digits = number.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

export function HotlinesPanel({
  location,
  isOnline,
}: {
  location: LocationRef;
  isOnline: boolean;
}) {
  const [data, setData] = useState<HotlinesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHotlines = async () => {
      setLoading(true);
      setError(null);

      if (!isOnline) {
        setData({
          location,
          hotlines: NATIONAL_FALLBACK,
          hasBarangaySpecific: false,
          hasCitySpecific: false,
          disclaimer:
            "You are offline. Showing national emergency numbers only. Connect to load city and barangay hotlines for your location.",
        });
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/hotlines?barangayCode=${encodeURIComponent(location.barangayCode)}`
        );
        if (!res.ok) throw new Error("Failed");
        const result = (await res.json()) as HotlinesResponse;
        setData(result);
      } catch {
        setError(
          "Could not load emergency hotlines. For immediate danger, call 911."
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchHotlines();
  }, [location, isOnline]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState title="Emergency hotlines" message={error} />;
  if (!data) return null;

  const grouped = data.hotlines.reduce<
    Record<string, HotlinesResponse["hotlines"]>
  >((acc, hotline) => {
    const key = hotline.category;
    acc[key] = acc[key] ? [...acc[key], hotline] : [hotline];
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-ph-blue">Emergency hotlines</h3>
        <p className="text-sm text-slate-600">
          {location.barangayName}, {location.cityMunicipality}
        </p>
      </div>

      <p className="rounded-lg border border-ph-gold/40 bg-ph-gold-light px-3 py-2 text-xs text-slate-700">
        {data.disclaimer}
      </p>

      <div className="space-y-4">
        {Object.entries(grouped).map(([category, hotlines]) => (
          <section key={category}>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ph-blue">
              {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ??
                category}
            </h4>
            <ul className="space-y-2">
              {hotlines.map((hotline) => (
                <li
                  key={`${hotline.scope}-${hotline.label}-${hotline.number}`}
                  className="rounded-lg border border-ph-blue/20 bg-white p-3"
                >
                  <p className="font-medium text-slate-900">{hotline.label}</p>
                  <a
                    href={formatTelHref(hotline.number)}
                    className="mt-1 inline-block text-lg font-semibold text-ph-blue underline-offset-2 hover:underline"
                  >
                    {hotline.number}
                  </a>
                  {hotline.notes && (
                    <p className="mt-1 text-xs text-slate-500">{hotline.notes}</p>
                  )}
                  <p className="mt-1 text-xs capitalize text-slate-500">
                    {hotline.scope} contact
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
