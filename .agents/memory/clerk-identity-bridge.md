---
name: Clerk identity bridge
description: Preserve migrated account IDs when connecting Clerk sessions to local RunBuddy records.
---

For migrated accounts, Clerk's `sessionClaims.userId` carries the legacy Replit subject ID that remains in `users.id` and `runners.authUserId`. Use that claim for local database lookups; `auth.userId` is the Clerk-native ID and is for Clerk API calls only. New accounts use the session claim when present, with `auth.userId` as the fallback. Keep the `users` and `sessions` tables and their foreign keys intact during the provider migration.

**Why:** Replacing the provider must not change the local identity value used by runner-profile relationships. Using the Clerk-native ID for migrated users would make their existing runner profiles appear unlinked.

**How to apply:** Whenever a Clerk session is resolved to local RunBuddy data, prefer `sessionClaims.userId` for the bridge. Use `auth.userId` only when no bridge claim exists for a newly provisioned account or when calling Clerk APIs.

For ownership-sensitive website navigation, derive the runner ID from the authenticated `/runners/me` response and scope its query key to the Clerk user ID. Do not use a locally persisted or manually selected runner ID as the destination for “My profile.”

**Why:** Client-side runner selection can be stale or point at a different public runner, while the authenticated endpoint returns only the runner owned by the current account.

**How to apply:** Use server-confirmed identity for links and actions that claim to represent the signed-in runner; keep client-selected IDs for presentation only when their non-authoritative role is explicit.