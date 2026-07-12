const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const locationsPath = path.join(projectRoot, "data", "psgc", "locations.json");
const evacCentersPath = path.join(projectRoot, "data", "seed", "evac-centers.json");

const locations = JSON.parse(fs.readFileSync(locationsPath, "utf8"));
const verifiedCenters = fs.existsSync(evacCentersPath)
  ? JSON.parse(fs.readFileSync(evacCentersPath, "utf8"))
  : [];

const verifiedCodes = new Set(
  verifiedCenters.map((center) => center.location.barangayCode)
);
const totalBarangays = locations.length;
const verifiedBarangays = verifiedCodes.size;
const mockOnlyBarangays = totalBarangays - verifiedBarangays;

console.log("Mock evacuation center synthesis");
console.log(`Total PSGC barangays: ${totalBarangays}`);
console.log(
  `Verified LGU/Supabase centers: ${verifiedCenters.length} records across ${verifiedBarangays} barangays`
);
console.log(`Mock-only barangays (runtime): ${mockOnlyBarangays}`);
console.log(
  `Effective coverage with mocks: 100% (${totalBarangays}/${totalBarangays} barangays)`
);
console.log("");
console.log(
  "Mock centers use the nearest mapped public school from OpenStreetMap (cached per barangay), isMock: true, and status UNKNOWN."
);
console.log(
  "Replace mock entries by adding verified records to Supabase evacuation_centers."
);
