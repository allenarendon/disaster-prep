-- Remove fictional starter bulletins (e.g. fake "Typhoon Carina" training data).
-- Run in Supabase → SQL Editor, then refresh the app.

DELETE FROM guidance_cache
WHERE bulletin_id IN (
  'bul-typhoon-ncr-001',
  'bul-flood-mandaluyong-002',
  'bul-landslide-albay-003'
);

DELETE FROM hazard_bulletins
WHERE id IN (
  'bul-typhoon-ncr-001',
  'bul-flood-mandaluyong-002',
  'bul-landslide-albay-003'
);
