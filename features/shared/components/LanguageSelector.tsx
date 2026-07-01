"use client";

import { useCallback, useEffect, useState } from "react";
import type { LanguageCode, LocationRef } from "@/features/shared/types";

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  tl: "Tagalog",
  ceb: "Bisaya",
};

const STORAGE_KEY = "disaster-prep-language";

export function LanguageSelector({
  value,
  onChange,
}: {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language" className="text-sm font-medium text-slate-700">
        Language
      </label>
      <select
        id="language"
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
      >
        {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_LABELS[code]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function useLanguagePreference(): [
  LanguageCode,
  (lang: LanguageCode) => void,
] {
  const [language, setLanguage] = useState<LanguageCode>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (stored && ["en", "tl", "ceb"].includes(stored)) {
      setLanguage(stored);
    }
  }, []);

  const update = useCallback((lang: LanguageCode) => {
    setLanguage(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  return [language, update];
}
