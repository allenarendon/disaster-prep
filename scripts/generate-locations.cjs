/**
 * Generates data/psgc/locations.json from the open-admin-data PSGC dataset
 * (CC-BY-4.0, https://github.com/open-admin-data/philippines-administrative-divisions)
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(ROOT, "data", "psgc", "locations.json");
const BASE_URL =
  "https://raw.githubusercontent.com/open-admin-data/philippines-administrative-divisions/main/data/barangay-by-region";

const REGION_FILES = [
  "national-capital-region-NCR.json",
  "ilocos-region-R01.json",
  "cagayan-valley-R02.json",
  "central-luzon-R03.json",
  "calabarzon-R04A.json",
  "bicol-region-R05.json",
  "western-visayas-R06.json",
  "central-visayas-R07.json",
  "eastern-visayas-R08.json",
  "zamboanga-peninsula-R09.json",
  "northern-mindanao-R10.json",
  "davao-region-R11.json",
  "soccsksargen-R12.json",
  "caraga-R13.json",
  "cordillera-administrative-region-CAR.json",
  "mimaropa-region-R17.json",
  "autonomous-region-in-muslim-mindanao-ARMM.json",
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

function formatRegionName(record) {
  const region = record.ancestors?.find((ancestor) => ancestor.level === 1);
  if (!region?.name?.slug) {
    return region?.name?.en ?? "";
  }
  const slug = region.name.slug;
  if (slug.endsWith("-NCR")) return "NCR";
  if (slug.endsWith("-CAR")) return "CAR";
  if (slug.endsWith("-ARMM")) return "BARMM";
  const match = slug.match(/-(R\d{2}A?)$/);
  if (match) {
    const code = match[1];
    if (code === "R04A") return "Region IV-A";
    return `Region ${code.slice(1)}`;
  }
  return region.name.en;
}

function toLocationRef(record) {
  const province = record.ancestors?.find((ancestor) => ancestor.level === 2);
  const city = record.parent;
  const location = {
    barangayCode: record.id,
    barangayName: record.name.en,
    cityMunicipality: city?.name?.en ?? "",
    province: province?.name?.en ?? "",
    region: formatRegionName(record),
  };

  const lat = record.geo?.lat ? Number.parseFloat(record.geo.lat) : undefined;
  const lng = record.geo?.lon ? Number.parseFloat(record.geo.lon) : undefined;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    location.lat = lat;
    location.lng = lng;
  }

  return location;
}

async function main() {
  const syncOnly = process.argv.includes("--sync-only");
  let deduped;

  if (syncOnly) {
    deduped = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
    process.stdout.write(`Loaded ${deduped.length} barangays from cache\n`);
    return;
  }

  const records = [];

  for (const file of REGION_FILES) {
    process.stdout.write(`Fetching ${file}...\n`);
    const batch = await fetchJson(`${BASE_URL}/${file}`);
    records.push(...batch);
  }

  const locations = records
    .filter((record) => record.level === 4)
    .map(toLocationRef)
    .sort((a, b) => a.barangayCode.localeCompare(b.barangayCode));

  const unique = new Map();
  for (const location of locations) {
    unique.set(location.barangayCode, location);
  }
  deduped = [...unique.values()];

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(deduped, null, 2)}\n`, "utf8");
  process.stdout.write(
    `Wrote ${deduped.length} barangays to ${path.relative(ROOT, OUTPUT)}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
