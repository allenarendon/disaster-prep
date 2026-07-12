-- Run this if npm run seed:bulletins fails with:
--   invalid input syntax for type uuid: "bul-typhoon-ncr-001"
--
-- The Table Editor often creates id as UUID; this app uses TEXT bulletin ids.

DROP TABLE IF EXISTS guidance_cache;
DROP TABLE IF EXISTS hazard_bulletins;

CREATE TABLE hazard_bulletins (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  hazard_type TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  affected_areas JSONB NOT NULL,
  severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  raw_text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bulletins_valid_until ON hazard_bulletins(valid_until);

CREATE TABLE IF NOT EXISTS guidance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id TEXT NOT NULL,
  language TEXT NOT NULL,
  phase TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bulletin_id, language, phase)
);
