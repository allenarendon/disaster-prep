const assert = require("assert");
const path = require("path");
require("module-alias").addAlias("@", path.join(__dirname, "..", "dist-test"));

async function main() {
  const { resetLocalStoreForTests } = require("../dist-test/lib/data/local-store");
  const { resetDataStoreForTests } = require("../dist-test/lib/data/supabase-store");
  const { resolveEvacCenterStatus } = require("../dist-test/features/evac-centers/server/status-resolver");
  const { generateGuidance } = require("../dist-test/features/guidance/server/guidance-service");
  const { submitCommunityReport } = require("../dist-test/features/reports/server/report-service");
  const { searchLocations, resolveLocation } = require("../dist-test/lib/data/location-resolver");
  const { verifyLguAdmin } = require("../dist-test/lib/auth/lgu-admin");
  const { isBundleStale } = require("../dist-test/lib/offline/bundle-utils");
  const { communityReportInputSchema } = require("../dist-test/lib/validation/schemas");
  const { LocalDataStore } = require("../dist-test/lib/data/local-store");

  resetDataStoreForTests();
  resetLocalStoreForTests();

  assert.ok(searchLocations("Addition Hills").length > 0);
  const disambiguation = resolveLocation({ query: "Addition Hills" });
  assert.strictEqual(disambiguation.resolved, undefined);
  assert.ok(disambiguation.suggestions.length > 1);

  const noBulletin = await generateGuidance({
    location: {
      barangayCode: "999999999",
      barangayName: "Nowhere",
      cityMunicipality: "Nowhere City",
      province: "Nowhere Province",
      region: "Nowhere Region",
    },
    language: "en",
    requestedAt: new Date().toISOString(),
  });
  assert.ok(noBulletin.guidance.every((g) => g.isFallback));

  const { setLocalBulletinsForTests } = require("../dist-test/lib/data/local-store");
  const {
    activeTyphoonBulletin,
    activeFloodBulletin,
    additionHillsLocation,
  } = require("../dist-test/lib/data/test-fixtures");
  setLocalBulletinsForTests([activeTyphoonBulletin, activeFloodBulletin]);

  const multi = await generateGuidance({
    location: additionHillsLocation,
    language: "en",
    requestedAt: new Date().toISOString(),
  });
  const bulletinIds = new Set(
    multi.guidance.filter((g) => g.bulletinId !== "none").map((g) => g.bulletinId)
  );
  assert.ok(bulletinIds.size >= 2);

  const store = new LocalDataStore();
  const baseCenter = {
    id: "evac-test-001",
    name: "Test Center",
    location: {
      barangayCode: "137401001",
      barangayName: "Addition Hills",
      cityMunicipality: "Mandaluyong",
      province: "Metro Manila",
      region: "NCR",
    },
    lat: 14.58,
    lng: 121.04,
    status: "OPEN",
    statusUpdatedAt: new Date().toISOString(),
    statusSource: "LGU_ADMIN",
    reportCount: 0,
  };

  const now = new Date().toISOString();
  for (let i = 0; i < 2; i++) {
    await store.createReport({
      type: "EVAC_STATUS",
      targetEvacCenterId: baseCenter.id,
      location: baseCenter.location,
      message: `Report ${i}`,
      reportedStatus: "FULL",
      submittedAt: now,
      clientHash: `hash-${i}`,
    });
  }

  const lguResolved = await resolveEvacCenterStatus(baseCenter, store);
  assert.strictEqual(lguResolved.status, "OPEN");
  assert.ok(lguResolved.conflictNote);

  const unknownResolved = await resolveEvacCenterStatus(
    { ...baseCenter, status: "UNKNOWN", statusSource: "DEFAULT_UNKNOWN" },
    store
  );
  assert.strictEqual(unknownResolved.status, "UNKNOWN");

  resetLocalStoreForTests();
  const baseInput = {
    type: "ROAD_CONDITION",
    location: baseCenter.location,
    message: "Road flooded",
    submittedAt: new Date().toISOString(),
    clientHash: "rate-limit-hash",
  };
  for (let i = 0; i < 10; i++) {
    await store.createReport({ ...baseInput, message: `Report ${i}` });
  }
  const rateLimited = await submitCommunityReport({
    ...baseInput,
    message: "11th report",
  });
  assert.strictEqual(rateLimited.ok, false);

  const invalid = communityReportInputSchema.safeParse({
    ...baseInput,
    type: "EVAC_STATUS",
    reportedStatus: "FULL",
  });
  assert.strictEqual(invalid.success, false);

  process.env.LGU_ADMIN_API_KEY = "test-key";
  const authed = {
    headers: { get: (name) => (name === "x-lgu-admin-key" ? "test-key" : null) },
  };
  const unauthed = {
    headers: { get: () => null },
  };
  assert.strictEqual(verifyLguAdmin(authed), true);
  assert.strictEqual(verifyLguAdmin(unauthed), false);
  delete process.env.LGU_ADMIN_API_KEY;

  assert.strictEqual(isBundleStale(new Date().toISOString()), false);
  const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(isBundleStale(old), true);

  console.log("All smoke tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
