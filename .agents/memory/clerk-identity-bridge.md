---
name: Clerk identity bridge
description: Preserve migrated account IDs when connecting Clerk sessions to local RunBuddy records.
---

For migrated accounts, Clerk's `sessionClaims.userId` carries the legacy Replit subject ID that remains in `users.id` and `runners.authUserId`. Use that claim for local database lookups; `auth.userId` is the Clerk-native ID and is for Clerk API calls only. New accounts use the session claim when present, with `auth.userId` as the fallback. Keep the `users` and `sessions` tables and their foreign keys intact during the provider migration.

**Why:** Replacing the provider must not change the local identity value used by runner-profile relationships. Using the Clerk-native ID for migrated users would make their existing runner profiles appear unlinked.

**How to apply:** Whenever a Clerk session is resolved to local RunBuddy data, prefer `sessionClaims.userId` for the bridge. Use `auth.userId` only when no bridge claim exists for a newly provisioned account or when calling Clerk APIs.