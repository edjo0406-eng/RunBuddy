# Threat Model

## Project Overview

RunDate/RunMatch is a running community web app (dating + running-partner finder).
Monorepo (pnpm workspaces):
- **Frontend**: React + Vite (`artifacts/runmatch`) served at `/`
- **API**: Express 5 (`artifacts/api-server`) served at `/api`
- **DB**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Auth**: Replit OIDC (`lib/replit-auth-web`, `artifacts/api-server/src/lib/auth.ts`)
- **Design mockup**: `artifacts/mockup-sandbox` at `/__mockup` (dev/design only)

Users authenticate via Replit OIDC, create runner profiles, browse/filter other
runners, send connection requests (date/buddy), and exchange private direct
messages.

## Assets

- **Private direct messages** — the `messages` table stores 1:1 private
  conversations between runners. Highest-value confidentiality asset.
- **Runner PII** — name, age, gender, bio, city/country, precise `lat`/`lng`,
  plus third-party tracking-app profile URLs.
- **User/auth records** — `users` (OIDC identity) and `sessions` (server-side
  session store holding access/refresh tokens).
- **Profile integrity** — a runner's public-facing profile content.
- **Connection state** — pending/accepted/declined date/buddy requests.
- **Application secrets** — `DATABASE_URL`, `REPL_ID`, OIDC config (server-only env).

## Trust Boundaries

- **Browser → API** — all requests cross this boundary and are untrusted.
- **API → PostgreSQL** — Drizzle ORM with parameterized queries.
- **Public / Authenticated** — an OIDC auth layer exists. `authMiddleware`
  (global) populates `req.user` from a session cookie (`sid`) or `Authorization:
  Bearer <sid>`. Sensitive endpoints call `requireAuthentication` and derive the
  acting runner server-side via `getAuthenticatedRunner` (maps `req.user.id` →
  `runners.authUserId`). The acting runner is NOT taken from client input.
- **User / Admin** — no admin role exists; all authenticated users are peers.

## Scan Anchors

- Auth core: `artifacts/api-server/src/lib/auth.ts` (session store, OIDC config),
  `src/middlewares/authMiddleware.ts` (session resolution + refresh),
  `src/lib/authorization.ts` (`requireAuthentication`, `getAuthenticatedRunner`,
  `requireRunner`, `publicRunnerSelection`), `src/routes/auth.ts` (login/callback/
  logout/mobile token exchange).
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

Authentication is provided by Replit OIDC with server-side sessions
(`sessions` table, random 32-byte `sid`, httpOnly+secure+sameSite=lax cookie).
The acting runner is derived from the session, not client input. Required
guarantee: sensitive endpoints MUST call `requireAuthentication` and derive
identity via `getAuthenticatedRunner`; the OIDC `state`/`nonce`/PKCE parameters
MUST be verified (they are, in both browser and mobile token-exchange flows).

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

Login/logout `returnTo` is validated by `getSafeReturnTo`, which now normalizes
backslashes before validation, rejects protocol-relative (`//`) and absolute
URLs, and re-derives a same-origin path via `URL` parsing. The previously
reported backslash → protocol-relative open-redirect bypass is closed. Required
guarantee: redirect targets MUST remain normalized and confirmed same-origin.

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
