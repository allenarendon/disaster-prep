import fs from "fs";
import path from "path";
import { ingestPagasaCapBulletins } from "@/features/ingestion/server/pagasa-ingest-service";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();
  const result = await ingestPagasaCapBulletins();
  console.log("PAGASA CAP ingestion complete:");
  console.log(`  fetched: ${result.fetched}`);
  console.log(`  upserted: ${result.upserted}`);
  console.log(`  expired: ${result.expired}`);
  console.log(`  skipped: ${result.skipped}`);
  if (result.errors.length > 0) {
    console.log("  errors:");
    for (const err of result.errors) {
      console.log(`    - ${err}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
