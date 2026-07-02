const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const locationsPath = path.join(projectRoot, "data", "psgc", "locations.json");
const evacCentersPath = path.join(projectRoot, "data", "seed", "evac-centers.json");

const locations = JSON.parse(fs.readFileSync(locationsPath, "utf8"));
const centers = JSON.parse(fs.readFileSync(evacCentersPath, "utf8"));

const coveredCodes = new Set(centers.map((center) => center.location.barangayCode));
const totalBarangays = locations.length;
const coveredBarangays = coveredCodes.size;
const uncoveredBarangays = totalBarangays - coveredBarangays;
const coveragePct = ((coveredBarangays / totalBarangays) * 100).toFixed(3);

const byRegion = new Map();
for (const location of locations) {
  const key = location.region;
  if (!byRegion.has(key)) {
    byRegion.set(key, { total: 0, covered: 0 });
  }
  const entry = byRegion.get(key);
  entry.total += 1;
  if (coveredCodes.has(location.barangayCode)) {
    entry.covered += 1;
  }
}

console.log(`Total PSGC barangays: ${totalBarangays}`);
console.log(`Verified barangays (seed/LGU data): ${coveredBarangays}`);
console.log(`Mock-only barangays (runtime placeholder): ${uncoveredBarangays}`);
console.log(`Verified coverage: ${coveragePct}%`);
console.log(`Effective coverage with mocks: 100.000%`);
console.log("");
console.log("Coverage by region:");

for (const [region, stats] of [...byRegion.entries()].sort((a, b) =>
  a[0].localeCompare(b[0])
)) {
  const pct = ((stats.covered / stats.total) * 100).toFixed(3);
  console.log(`${region}: ${stats.covered}/${stats.total} (${pct}%)`);
}
