"use client";

import { useEffect, useState } from "react";
import type { LocationRef } from "@/features/shared/types";
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
  const [suggestions, setSuggestions] = useState<LocationRef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && !value) {
      try {
        onChange(JSON.parse(stored) as LocationRef);
      } catch {
        // ignore invalid stored location
      }
    }
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
          `/api/locations/search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setSuggestions(data.matches ?? []);
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
            <p className="mt-1 text-xs text-amber-700">
              Multiple matches found — please select your exact barangay.
            </p>
          )}
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
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
