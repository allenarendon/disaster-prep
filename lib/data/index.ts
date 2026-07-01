import { getDataStore, resetDataStoreForTests } from "@/lib/data/supabase-store";
import { resetLocalStoreForTests } from "@/lib/data/local-store";

export { getDataStore, resetDataStoreForTests };
export { searchLocations, resolveLocation, getLocationByCode, getAllLocations } from "@/lib/data/location-resolver";
export type { DataStore } from "@/lib/data/types";

export function resetAllStoresForTests(): void {
  resetDataStoreForTests();
  resetLocalStoreForTests();
}
