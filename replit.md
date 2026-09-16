# RunBuddy

## Overview

A running community web app for finding running partners while traveling or at home.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (`artifacts/runmatch`) at `/`
- **API framework**: Express 5 (`artifacts/api-server`) at `/api`
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle for API server)

## Features

- Runner profiles with city/country, bio, age, experience level, gender, and running preferences
- Running stats: weekly mileage, personal bests (5k/10k/half/marathon), avg pace, preferred run types
- Tracking app links: Strava, Garmin Connect, Nike Run Club, Polar, Suunto, Wahoo
- Connection requests between runners
- App-wide stats: total runners, countries represented
- Featured runners on homepage
- Filter runners by country, city, experience

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## API Routes

- `GET /api/runners` — list runners with optional filters (country, city, experience)
- `POST /api/runners` — create runner profile
- `GET /api/runners/:id` — get single runner
- `PUT /api/runners/:id` — update runner
- `GET /api/connections` — list connections for a runner
- `POST /api/connections` — create connection request
- `PUT /api/connections/:id` — accept/decline connection
- `GET /api/stats/summary` — app-wide stats
- `GET /api/stats/countries` — runners grouped by country
- `GET /api/stats/featured` — featured runners for homepage

## DB Schema

- `runners` — runner profiles with JSON columns for `tracking_apps` and `running_stats`
- `connections` — connection requests with status (pending/accepted/declined)

## Codegen Fix

The orval codegen script in `lib/api-spec/package.json` overwrites `lib/api-zod/src/index.ts` after orval runs to avoid a naming conflict between Zod validators and TypeScript type files.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
