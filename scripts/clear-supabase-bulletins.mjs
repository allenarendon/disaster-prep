import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const FICTIONAL_STARTER_IDS = [
  "bul-typhoon-ncr-001",
  "bul-flood-mandaluyong-002",
  "bul-landslide-albay-003",
];

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!url || !key) {
    console.error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local"
    );
    process.exit(1);
  }

  const client = createClient(url, key);

  const { error: cacheError } = await client
    .from("guidance_cache")
    .delete()
    .in("bulletin_id", FICTIONAL_STARTER_IDS);

  if (cacheError) {
    console.warn("guidance_cache delete:", cacheError.message);
  }

  const { data, error } = await client
    .from("hazard_bulletins")
    .delete()
    .in("id", FICTIONAL_STARTER_IDS)
    .select("id");

  if (error) {
    console.error("Failed to clear hazard_bulletins:", error.message);
    process.exit(1);
  }

  const removed = data?.length ?? 0;
  console.log(`Removed ${removed} fictional starter bulletin(s) from Supabase.`);
  if (removed === 0) {
    console.log("No matching rows found (may already be deleted).");
  }
  console.log("Addition Hills should now show: no active hazard advisory.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
