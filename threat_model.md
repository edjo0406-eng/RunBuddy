# Threat Model

## Project Overview

RunDate/RunMatch is a running community web app (dating + running-partner finder).
Monorepo (pnpm workspaces):
- **Frontend**: React + Vite (`artifacts/runmatch`) served at `/`
- **API**: Express 5 (`artifacts/api-server`) served at `/api`
- **DB**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Design mockup**: `artifacts/mockup-sandbox` at `/__mockup` (dev/design only)

Users create runner profiles, browse/filter other runners, send connection
requests (date/buddy), and exchange private direct messages.

## Assets

- **Private direct messages** — the `messages` table stores 1:1 private
  conversations between runners. Highest-value confidentiality asset.
- **Runner PII** — name, age, gender, bio, city/country, and precise
  geolocation (`lat`/`lng`), plus third-party tracking-app profile URLs.
- **Profile integrity** — a runner's public-facing profile content.
- **Connection state** — pending/accepted/declined date/buddy requests.
- **Application secrets** — `DATABASE_URL` (server-only env).

## Trust Boundaries

- **Browser → API** — all requests cross this boundary and are fully untrusted.
- **API → PostgreSQL** — Drizzle ORM with parameterized queries.
- **Public / Authenticated** — *there is currently NO authentication layer.*
  Every endpoint is anonymously reachable and identifies the acting runner
  solely from client-supplied identifiers (`runnerId`, `meId`, `fromRunnerId`,
  path `:id`). This boundary is effectively absent.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/routes/*.ts`
  (`runners.ts`, `connections.ts`, `messages.ts`, `stats.ts`, `health.ts`),
  wired in `routes/index.ts`, mounted under `/api` in `app.ts`.
- Highest-risk area: `routes/messages.ts` (private messaging), `routes/runners.ts`
  (profile read/update), `routes/connections.ts`.
- No auth middleware anywhere; `app.ts` uses `cors()` (wildcard) + body parsers only.
- DB schema: `lib/db/src/schema/runners.ts` (runners, connections, messages).
- Dev-only / ignore unless proven reachable: `artifacts/mockup-sandbox`.

## Threat Categories

### Spoofing / Improper Authentication

There is no authentication or session mechanism. The server never establishes a
trusted subject. Any request may claim to act as any runner by setting
`fromRunnerId`, `meId`, `runnerId`, or the path `:id` to an arbitrary integer.
Runner IDs are sequential (`serial`), so all identities are trivially guessable.
Required guarantee: sensitive endpoints MUST authenticate the caller server-side
and derive the acting runner from the authenticated session, never from
request-supplied identifiers.

### Information Disclosure (BOLA / IDOR)

Private messages and inboxes are readable by anyone supplying a target runner id.
Public runner listings return full records including precise `lat`/`lng`
coordinates. Required guarantee: message and profile reads MUST be scoped to the
authenticated owner; precise location MUST NOT be exposed to arbitrary callers.

### Tampering / Elevation of Privilege

Profile updates (`PUT /runners/:id`) and connection updates
(`PUT /connections/:id`) perform no ownership check, allowing anyone to overwrite
any profile or accept/decline any connection. Message send allows impersonation.
Required guarantee: every write MUST verify the authenticated caller owns the
target object.

### Denial of Service

No rate limiting on any endpoint; message send and profile create/update are
anonymous and unbounded. Lower priority relative to the access-control gaps.
