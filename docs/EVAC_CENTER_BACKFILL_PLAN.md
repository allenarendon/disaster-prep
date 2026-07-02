# Evacuation Center Data Backfill Plan

This runbook defines a phased process for scaling known evacuation center coverage while preserving the app's safety behavior rules.

## Goals
- Increase `knownEvacCenter` coverage progressively across PSGC barangays.
- Keep user experience non-empty for uncovered areas.
- Preserve LGU precedence and `UNKNOWN` safety defaults.

## Phase 1 (Current): Prioritization + transparent UX
- Keep all PSGC barangays searchable.
- Prioritize **verified** covered barangays first in search results.
- Synthesize one **mock** evacuation center per barangay without verified seed data (`isMock: true`, status `UNKNOWN`), placed at the nearest mapped public school from OpenStreetMap relative to the barangay hall.
- Show explicit placeholder messaging in evac results for mock-only barangays.

## Phase 2: Structured seed expansion
- Expand `data/seed/evac-centers.json` in batches using this order:
  1. NCR (highest population and current seed overlap)
  2. Region VII (Central Visayas)
  3. Region V (Bicol)
  4. Remaining regions
- Add at least one verified evacuation center per high-priority barangay cluster before moving to next batch.

## Phase 3: Validation checkpoints per batch
- Every added center record must include:
  - `id`, `name`, `location.barangayCode`, `lat`, `lng`
  - `status` and `statusSource`
  - `statusUpdatedAt` as UTC ISO string
- Run after each batch:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run coverage:evac-centers`

## Phase 4: Operational handoff
- Move from seed-only updates to LGU-verified sync workflow (Supabase ingestion).
- Continue exposing uncovered fallback messaging until regional coverage is acceptable.

## Coverage tracking command
- `npm run coverage:evac-centers` — verified seed/LGU coverage
- `npm run generate:mock-evac-centers` — summary of runtime mock synthesis

This command reports:
- Total PSGC barangays
- Verified vs mock-only barangays
- Coverage percentage (verified and effective with mocks)
- Region-level coverage breakdown

