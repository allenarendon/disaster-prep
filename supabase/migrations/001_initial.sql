-- Supabase migration for disaster-prep v1

CREATE TABLE IF NOT EXISTS hazard_bulletins (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  hazard_type TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  affected_areas JSONB NOT NULL,
  severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  raw_text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evacuation_centers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  barangay_code TEXT NOT NULL,
  location JSONB NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  capacity INTEGER,
  status TEXT NOT NULL DEFAULT 'UNKNOWN',
  status_updated_at TIMESTAMPTZ NOT NULL,
  status_source TEXT NOT NULL DEFAULT 'DEFAULT_UNKNOWN',
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  target_evac_center_id TEXT REFERENCES evacuation_centers(id),
  location JSONB NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 280),
  reported_status TEXT,
  submitted_at TIMESTAMPTZ NOT NULL,
  client_hash TEXT NOT NULL,
  needs_review BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_reports_evac_center ON community_reports(target_evac_center_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_reports_client_hash ON community_reports(client_hash, submitted_at);
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
