"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getOfflineBundle,
  isBundleStale,
  syncOfflineBundle,
} from "@/features/offline/idb";
import type { OfflineBundle } from "@/features/shared/types";

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [bundle, setBundle] = useState<OfflineBundle | null>(null);
  const [hasCachedBundle, setHasCachedBundle] = useState<boolean | null>(null);
  const [isStale, setIsStale] = useState(false);

  const refreshBundle = useCallback(async () => {
    if (navigator.onLine) {
      const synced = await syncOfflineBundle();
      if (synced) {
        setBundle(synced);
        setHasCachedBundle(true);
        setIsStale(isBundleStale(synced.generatedAt));
        return;
      }
    }
    const cached = await getOfflineBundle();
    setBundle(cached);
    setHasCachedBundle(!!cached);
    if (cached) {
      setIsStale(isBundleStale(cached.generatedAt));
    }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      void refreshBundle();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    void refreshBundle();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshBundle]);

  return { isOnline, bundle, hasCachedBundle, isStale, refreshBundle };
}
