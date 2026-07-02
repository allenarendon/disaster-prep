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
| `npm run test` | Smoke tests (edge-case server logic) |
| `npm run generate:locations` | Regenerate PSGC barangay data (~42k locations) |

## Environment variables

Copy `.env.example` to `.env.local`:

- `ANTHROPIC_API_KEY` — optional; enables real Claude guidance generation
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — optional; enables Supabase data store
- `LGU_ADMIN_API_KEY` — required for `PATCH /api/evac-centers/:id/status`
- `NEXT_PUBLIC_APP_URL` — base URL for share links

Without Supabase or Anthropic keys, the app uses seeded JSON data and mock AI responses.

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
