import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BULLETINS_PATH = path.join(__dirname, "seed-data", "hazard-bulletins.json");
const VALID_DAYS = 30;

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

function toDbRow(bulletin, issuedAt, validUntil) {
  return {
    id: bulletin.id,
    source: bulletin.source,
    hazard_type: bulletin.hazardType,
    issued_at: issuedAt.toISOString(),
    valid_until: validUntil.toISOString(),
    affected_areas: bulletin.affectedAreas,
    severity: bulletin.severity,
    raw_text: bulletin.rawText,
  };
}

function formatConnectivityError(error, url) {
  const cause = error?.cause;
  const code = cause?.code ?? cause?.errno;
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  if (code === "ENOTFOUND" || String(cause?.message ?? "").includes("ENOTFOUND")) {
    return [
      `Cannot resolve Supabase host: ${hostname}`,
      "The project URL in .env.local does not exist in DNS.",
      "Fix: open https://supabase.com/dashboard → your project → Settings → API",
      "Copy Project URL into NEXT_PUBLIC_SUPABASE_URL and service_role key into SUPABASE_SERVICE_KEY.",
      "If the project was deleted, create a new one and run supabase/migrations/001_initial.sql first.",
      "Alternative: paste scripts/seed-supabase-bulletins.sql into Supabase SQL Editor (no local network needed).",
    ].join("\n");
  }

  return [
    `Network error reaching Supabase (${hostname}).`,
    cause?.message ?? error.message,
    "Check your internet connection, VPN, or firewall, then retry.",
  ].join("\n");
}

async function verifySupabaseReachable(url, key) {
  const healthUrl = `${url.replace(/\/$/, "")}/rest/v1/`;
  try {
    const response = await fetch(healthUrl, {
      method: "HEAD",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (response.status >= 500) {
      console.warn(`Warning: Supabase returned HTTP ${response.status}; continuing with upsert.`);
    }
  } catch (error) {
    console.error(formatConnectivityError(error, url));
    process.exit(1);
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

  await verifySupabaseReachable(url, key);

  const bulletins = JSON.parse(fs.readFileSync(BULLETINS_PATH, "utf8"));

  if (!Array.isArray(bulletins) || bulletins.length === 0) {
    console.log("No bulletins in scripts/seed-data/hazard-bulletins.json — nothing to seed.");
    console.log("Add real PAGASA/PHIVOLCS bulletin text to that file, or insert rows in Supabase directly.");
    console.log("To remove old fictional starter rows: npm run clear:bulletins");
    return;
  }
  const issuedAt = new Date();
  const validUntil = new Date(
    issuedAt.getTime() + VALID_DAYS * 24 * 60 * 60 * 1000
  );

  const rows = bulletins.map((bulletin) =>
    toDbRow(bulletin, issuedAt, validUntil)
  );

  const client = createClient(url, key);
  const { data, error } = await client
    .from("hazard_bulletins")
    .upsert(rows, { onConflict: "id" })
    .select("id, hazard_type, issued_at, valid_until");

  if (error) {
    console.error("Failed to seed hazard_bulletins:", error.message);
    if (error.message?.includes("invalid input syntax for type uuid")) {
      console.error(
        [
          "",
          "Your hazard_bulletins.id column is UUID, but this app expects TEXT ids (e.g. bul-typhoon-ncr-001).",
          "Fix: Supabase → SQL Editor → run:",
          "  supabase/migrations/002_fix_hazard_bulletins_text_id.sql",
          "Then run: npm run seed:bulletins",
        ].join("\n")
      );
    } else if (error.message?.includes("fetch failed")) {
      console.error(formatConnectivityError(error, url));
    }
    process.exit(1);
  }

  console.log(`Seeded ${data?.length ?? rows.length} hazard bulletin(s).`);
  console.log(`issued_at: ${issuedAt.toISOString()}`);
  console.log(`valid_until: ${validUntil.toISOString()}`);
  for (const row of data ?? rows) {
    const id = row.id;
    const hazard = row.hazard_type ?? row.hazardType;
    console.log(`  - ${id} (${hazard})`);
  }
  console.log("");
  console.log("Try: Addition Hills, Mandaluyong — should show active PAGASA guidance.");
}

main().catch((error) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && String(error?.message ?? "").includes("fetch failed")) {
    console.error(formatConnectivityError(error, url));
  } else {
    console.error(error);
  }
  process.exit(1);
});
