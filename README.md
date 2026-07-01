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
| `npm run test` | Vitest unit tests |

## Environment variables

Copy `.env.example` to `.env.local`:

- `ANTHROPIC_API_KEY` — optional; enables real Claude guidance generation
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — optional; enables Supabase data store
- `LGU_ADMIN_API_KEY` — required for `PATCH /api/evac-centers/:id/status`
- `NEXT_PUBLIC_APP_URL` — base URL for share links

Without Supabase or Anthropic keys, the app uses seeded JSON data and mock AI responses.

## Features

- Location-specific hazard guidance (Tagalog, Bisaya, English)
- Evacuation center map and status with LGU precedence rules
- Community reporting with rate limiting
- Offline PWA with IndexedDB bundle caching
- Service worker for graceful offline degradation

## Architecture

See [`SPEC_AND_ARCHITECTURE.md`](./SPEC_AND_ARCHITECTURE.md) for full behavior rules and acceptance criteria.
