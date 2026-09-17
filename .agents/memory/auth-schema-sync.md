---
name: Auth schema synchronization
description: Development database requirements for the Replit OIDC callback user upsert.
---

The Replit OIDC callback depends on the development database having the current `users` and `sessions` tables plus the runner-to-user foreign identity column defined by the Drizzle schema. A stale database can let OAuth start successfully but fail with a 500 while persisting the authenticated user.

**Why:** The application can build and the OAuth provider can return a callback while database drift remains invisible until the first real sign-in.

**How to apply:** When auth callback persistence fails, compare the live development schema with `lib/db/src/schema/auth.ts` and `lib/db/src/schema/runners.ts`. Prefer the supported development schema push; never approve a data-loss/truncation prompt just to bypass drift.