"use client";

import { useEffect, useRef, useState } from "react";
import type { LocationRef, LocationSearchMatch } from "@/features/shared/types";
import { Button } from "@/features/shared/components/Button";

const STORAGE_KEY = "disaster-prep-location";

export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationRef | null;
  onChange: (location: LocationRef | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const didAutoLocate = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && !value) {
      try {
        onChange(JSON.parse(stored) as LocationRef);
      } catch {
        // ignore invalid stored location
      }
      return;
    }

    if (didAutoLocate.current || value || !navigator.geolocation) {
      return;
    }

    didAutoLocate.current = true;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const res = await fetch(
            `/api/locations/nearest?lat=${lat}&lng=${lng}`
          );
          if (!res.ok) return;
          const data = await res.json();
          if (data.assigned && data.location) {
            onChange(data.location as LocationRef);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.location));
          }
        } catch {
          // ignore geolocation lookup failures, manual picker remains available
        }
      },
      () => {
        // geolocation denied/unavailable; keep manual picker flow
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/locations/search?q=${encodeURIComponent(query)}&limit=20`
        );
        const data = await res.json();
        setSuggestions((data.matches ?? []) as LocationSearchMatch[]);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const selectLocation = (location: LocationRef) => {
    onChange(location);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    setQuery("");
    setSuggestions([]);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="location" className="text-sm font-medium text-slate-700">
        Your barangay
      </label>
      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div>
            <p className="font-medium text-slate-900">{value.barangayName}</p>
            <p className="text-sm text-slate-500">
              {value.cityMunicipality}, {value.province}
            </p>
            <p className="text-xs text-slate-500">
              Coverage label appears in search results.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              onChange(null);
              setQuery("");
            }}
          >
            Change
          </Button>
        </div>
      ) : (
        <div className="relative">
          <input
            id="location"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search barangay name..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {loading && (
            <p className="mt-1 text-xs text-slate-500">Searching...</p>
          )}
          {suggestions.length > 1 && (
            <p className="mt-1 text-xs text-ph-gold-dark">
              Multiple matches found — please select your exact barangay.
            </p>
          )}
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {suggestions.map((loc) => (
                <li key={loc.barangayCode}>
                  <button
                    type="button"
                    onClick={() => selectLocation(loc)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium">{loc.barangayName}</span>
                    <span className="text-slate-500">
                      {" "}
                      — {loc.cityMunicipality}, {loc.province}
                    </span>
                    <span
                      className={`ml-2 inline-block rounded px-1.5 py-0.5 text-xs ${
                        loc.knownEvacCenter
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-ph-gold-light text-ph-gold-dark"
                      }`}
                    >
                      {loc.knownEvacCenter
                        ? "Has known evacuation center"
                        : "Limited evacuation center data"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
