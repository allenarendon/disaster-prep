# PH Disaster Preparedness & Evacuation Guide

AI-powered web application helping people in disaster-prone areas of the Philippines get plain-language, location-specific hazard guidance and find open evacuation centers.

## Quick start

**Requires Node.js 18.17+** for `npm run dev`, `build`, and `lint`. Use `.nvmrc` if you have nvm.

```bash
npm install
# If native module install fails on OneDrive/Windows, try:
# npm install --ignore-scripts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs in **local/mock mode** with no external credentials required.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run check:offline-bundle-size` | Validate offline bundle stays under 2MB |
| `npm run coverage:evac-centers` | Report barangay evacuation-center coverage |
| `npm run test` | Smoke tests (edge-case server logic) |
| `npm run clear:bulletins` | Remove old fictional starter bulletins from Supabase |
| `npm run ingest:bulletins` | Poll PAGASA CAP feed and upsert live bulletins into Supabase |

## Environment variables

Copy `.env.example` to `.env.local`:

- `ANTHROPIC_API_KEY` — optional; enables real Claude guidance generation
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — optional; enables Supabase data store
- `LGU_ADMIN_API_KEY` — required for `PATCH /api/evac-centers/:id/status`
- `NEXT_PUBLIC_APP_URL` — base URL for share links
- `CRON_SECRET` — secures `GET /api/cron/ingest-bulletins` (required for Vercel Cron; see below)
- `INGEST_CRON_SECRET` — optional alias for manual `POST` tests (can match `CRON_SECRET`)

Without Supabase or Anthropic keys, guidance shows “no active advisory” and mock AI responses.

### Seed Supabase bulletins (AI guidance)

After running `supabase/migrations/001_initial.sql` in your Supabase SQL Editor:

```bash
npm run seed:bulletins
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env.local`. Add **real** bulletin rows to `scripts/seed-data/hazard-bulletins.json` (official PAGASA/PHIVOLCS text only), then run the command. The default file is **empty** — the app will show “no active advisory” until real bulletins are loaded.

**Remove fictional starter data** (if you previously seeded the old Typhoon Carina examples):

```bash
npm run clear:bulletins
```

Or run `scripts/clear-supabase-bulletins.sql` in the SQL Editor.

If seeding fails with `invalid input syntax for type uuid`, your table was created with a UUID `id` column — run `supabase/migrations/002_fix_hazard_bulletins_text_id.sql` in the SQL Editor, then retry.

### Live bulletin ingestion (v1)

```bash
npm run ingest:bulletins
```

Polls **PAGASA**’s public CAP Atom feed (`publicalert.pagasa.dost.gov.ph`) and **PHIVOLCS-LAVA** daily volcano bulletins (`wovodat.phivolcs.dost.gov.ph`), maps affected areas to province/region-level PSGC coverage, and upserts into `hazard_bulletins`. Expired, final, cancelled, or superseded alerts are marked inactive.

| Source | Feed | Coverage |
|--------|------|----------|
| PAGASA | CAP Atom + XML | Province/region from CAP `areaDesc` |
| PHIVOLCS | LAVA HTML bulletins | Province/region from volcano lookup (Mayon→Albay, Taal→Batangas/Cavite/Laguna, etc.) |

If PHIVOLCS fetch fails locally with a TLS certificate error, set `PHIVOLCS_TLS_INSECURE=1` in `.env.local` (dev only).

#### Vercel Cron (automatic production polling)

`vercel.json` schedules ingestion **once daily** at 02:00 UTC (Hobby-plan limit). For every-30-minute polling, upgrade to Vercel Pro and change the schedule to `*/30 * * * *`.

```json
{ "path": "/api/cron/ingest-bulletins", "schedule": "0 2 * * *" }
```

Vercel invokes this route as **GET** and, when `CRON_SECRET` is set, sends:

`Authorization: Bearer <CRON_SECRET>`

**One-time setup**

1. Generate a secret (32+ random characters, no newlines):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. In **Vercel → Project → Settings → Environment Variables**, add for **Production**:

| Variable | Value |
|----------|--------|
| `CRON_SECRET` | your generated secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

Optional: set `INGEST_CRON_SECRET` to the same value if you also want to test with `POST`.

3. **Redeploy** production (push to `main` or redeploy from Vercel dashboard) so `vercel.json` cron is registered.

4. Verify in **Vercel → Project → Cron Jobs** — you should see `/api/cron/ingest-bulletins` on the `0 2 * * *` schedule (daily on Hobby).

5. After the first run, check Supabase `hazard_bulletins` for rows with ids like `pagasa-cap-...`.

**Manual test** (local or production):

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://disaster-prep-ruddy.vercel.app/api/cron/ingest-bulletins
```

Use `POST` instead of `GET` if you prefer; both are supported.

**Notes**

- Cron jobs run on **production** deployments only (not preview).
- Hobby plans allow **one cron run per day**; use `npm run ingest:bulletins` for manual refreshes between runs.
- If cron returns 401, confirm `CRON_SECRET` is set in Production env and redeployed.
- Local dev: add `CRON_SECRET` to `.env.local` (see `.env.example`).

Location search uses the full Philippine barangay list (~42,000 entries) from PSA PSGC data in [`data/psgc/locations.json`](data/psgc/locations.json). Regenerate with `npm run generate:locations` (see [`data/psgc/README.md`](data/psgc/README.md)).

## Deployment

Production deploys run via **GitHub Actions** on every push to `main` (after CI passes). The workflow is defined in [`.github/workflows/ci-deploy.yml`](./.github/workflows/ci-deploy.yml).

### One-time Vercel setup

1. Create a [Vercel](https://vercel.com) account.
2. Link the project locally to obtain org and project IDs:

```bash
npm i -g vercel
vercel login
vercel link
```

This creates `.vercel/project.json` (gitignored) with `orgId` and `projectId`.

3. Add **production environment variables** in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_APP_URL` | Yes | Your production URL, e.g. `https://disaster-prep.vercel.app` |
| `LGU_ADMIN_API_KEY` | Recommended | Strong random secret for evac status PATCH |
| `ANTHROPIC_API_KEY` | Optional | Enables real Claude guidance |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Only if using Supabase |
| `SUPABASE_SERVICE_KEY` | Optional | Server-only; never expose to client |
| `CRON_SECRET` | Recommended | Secures PAGASA ingest cron (`/api/cron/ingest-bulletins`) |

4. Create a Vercel token: Account Settings → Tokens.

5. Add **GitHub repository secrets** (repo → Settings → Secrets and variables → Actions):

| Secret | Source |
|--------|--------|
| `VERCEL_TOKEN` | Vercel account token |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |

### CI and deploy behavior

- **Pull requests** to `main`: runs lint, typecheck, smoke tests, and build only.
- **Push to `main`**: runs CI, then deploys to Vercel production via `vercel-action`.

After the first deploy, set `NEXT_PUBLIC_APP_URL` in Vercel to your live domain so share links point to production, then trigger a redeploy (push to `main` or redeploy from the Vercel dashboard).

## Features

- Location-specific hazard guidance (Tagalog, Bisaya, English)
- Evacuation center map and status with LGU precedence rules
- Community reporting with rate limiting
- Offline PWA with IndexedDB bundle caching
- Service worker for graceful offline degradation

## Architecture

See [`docs/SPEC_AND_ARCHITECTURE.md`](./docs/SPEC_AND_ARCHITECTURE.md) for full behavior rules and acceptance criteria.
