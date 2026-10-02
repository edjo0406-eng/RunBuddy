# Threat Model

## Project Overview

RunBuddy is a running community web app for finding running partners.
Monorepo (pnpm workspaces):
- **Frontend**: React + Vite (`artifacts/runmatch`) served at `/`
- **API**: Express 5 (`artifacts/api-server`) served at `/api`
- **DB**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Auth**: Clerk email/password with server-validated browser sessions
- **Design mockup**: `artifacts/mockup-sandbox` at `/__mockup` (dev/design only)

Users authenticate through the app, create runner profiles, browse/filter other
runners, send connection requests (date/buddy), and exchange private direct
messages.

## Assets

- **Private direct messages** — the `messages` table stores 1:1 private
  conversations between runners. Highest-value confidentiality asset.
- **Runner PII** — name, age, gender, bio, city/country, precise `lat`/`lng`,
  plus third-party tracking-app profile URLs.
- **User/auth records** — Clerk owns identity and browser sessions; the local
  `users` table preserves the account-to-runner bridge and app state. The
  `sessions` table remains in the schema but is no longer used for web sessions.
- **Profile integrity** — a runner's public-facing profile content.
- **Connection state** — pending/accepted/declined requests.
- **Application secrets** — database credentials and Clerk keys (server-only env).

## Trust Boundaries

- **Browser → API** — all requests cross this boundary and are untrusted.
- **API → PostgreSQL** — Drizzle ORM with parameterized queries.
- **Public / Authenticated** — `clerkMiddleware` validates the browser session
  cookie. Sensitive endpoints call `requireAuthentication`, which resolves the
  local user using `sessionClaims.userId` (the legacy ID for migrated accounts,
  Clerk's ID for new accounts), then derives the acting runner via
  `getAuthenticatedRunner` (`users.id` → `runners.authUserId`). The acting runner
  is NOT taken from client input.
- **User / Admin** — no admin role exists; all authenticated users are peers.

## Scan Anchors

- Auth core: Clerk proxy and middleware in `artifacts/api-server/src/app.ts`,
  `src/middlewares/clerkProxyMiddleware.ts`, and
  `src/lib/authorization.ts` (`requireAuthentication`, local-user bridge,
  `getAuthenticatedRunner`, `requireRunner`, `publicRunnerSelection`).
- Production entry points: `artifacts/api-server/src/routes/*.ts`, wired in
  `routes/index.ts`, mounted under `/api` in `app.ts`.
- Access control enforced: profile update scoped to `authUserId`; connection
  update restricted to recipient + pending; messages scoped to the authenticated
  runner; `fromRunnerId`/`meId` no longer accepted from clients. Request bodies
  validated with Zod objects, which strip unknown keys (no mass assignment of
  `authUserId`, `id`, etc.).
- Still public (aggregate only, low sensitivity): `GET /api/stats/summary`,
  `GET /api/stats/countries`.
- `app.ts` now uses a CORS origin allowlist (`CORS_ALLOWED_ORIGINS`) instead of
  reflecting arbitrary origins; `trust proxy` is set to 1.
- Rate limiting: global `/api` limiter (300/15min) plus per-route limiters for
  list/create runners, create connection, and send message.
- DB schema: `lib/db/src/schema/runners.ts`, `schema/auth.ts` (users, sessions).
- Dev-only / ignore unless proven reachable: `artifacts/mockup-sandbox`.

## Threat Categories

### Spoofing / Improper Authentication

Authentication is provided by Clerk; the API validates same-origin browser
session cookies with `clerkMiddleware`. The acting runner is derived from the
verified session and local user bridge, not client input. Required guarantee:
sensitive endpoints MUST call `requireAuthentication` and derive identity via
`getAuthenticatedRunner`; local database queries for migrated accounts use
`sessionClaims.userId`, never Clerk's native `auth.userId`.

### Information Disclosure (BOLA / IDOR)

Message and inbox reads are scoped to the authenticated runner. Runner listings
use `publicRunnerSelection`, which excludes `authUserId` and precise
`lat`/`lng`. Required guarantee: reads MUST continue to use scoped queries and
`publicRunnerSelection`; do not add sensitive columns to the public selection.

### Tampering / Elevation of Privilege

`PUT /runners/:id` is scoped to `authUserId`; `PUT /connections/:id` is limited
to the recipient of a pending request; message/connection creates ignore
client-supplied `fromRunnerId`. Zod strips unknown body keys, preventing mass
assignment. Required guarantee: every write MUST verify the authenticated caller
owns/controls the target object.

### Redirect handling

Clerk owns sign-in and sign-out redirects. The public home route remains
accessible when signed out; authenticated users are sent to the runner
discovery page. Required guarantee: do not add arbitrary external redirect
targets to authentication links.

### Security misconfiguration

CORS now uses an explicit origin allowlist from `CORS_ALLOWED_ORIGINS` with
credentials; requests without an `Origin` header are allowed (same-origin) and
unknown origins are rejected. Required guarantee: keep the allowlist explicit;
never reflect arbitrary origins while `credentials: true`.

### Denial of Service

Rate limiting is now in place: a global `/api` limiter plus tighter per-route
limiters on runner listing/creation, connection creation, and message sending.
The in-memory limiter bounds its key map (`maxKeys`) to prevent unbounded memory
growth. Message `content` is length-bounded via Zod. Required guarantee: keep
resource-intensive and write endpoints rate-limited and input-size-bounded.
