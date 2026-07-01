const DB_NAME = "disaster-prep-offline";
const DB_VERSION = 1;
const STORE_NAME = "bundles";
const BUNDLE_KEY = "current";

import type { OfflineBundle } from "@/features/shared/types";
import { isBundleStale } from "@/lib/offline/bundle-utils";

export { isBundleStale };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineBundle(bundle: OfflineBundle): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(bundle, BUNDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineBundle(): Promise<OfflineBundle | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(BUNDLE_KEY);
    request.onsuccess = () => resolve((request.result as OfflineBundle) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function syncOfflineBundle(): Promise<OfflineBundle | null> {
  try {
    const response = await fetch("/api/offline-bundle");
    if (!response.ok) return null;
    const bundle = (await response.json()) as OfflineBundle;
    await saveOfflineBundle(bundle);
    return bundle;
  } catch {
    return null;
  }
}
