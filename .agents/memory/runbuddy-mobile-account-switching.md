---
name: RunBuddy mobile account switching
description: Privacy rules for user-bound React Query data when the Expo app changes Clerk accounts.
---

Scope private mobile query keys to the active Clerk user and clear the shared query cache when the signed-in user ID changes. Account-specific screens should not render data while the new account's identity is unresolved.

**Why:** Expo keeps one app-level QueryClient while Clerk identity changes in place. Cache clearing happens after React receives the identity change, so user-scoped keys are also needed to keep the old account's messages out of the new account's first render.

**How to apply:** For each private mobile query, include the Clerk user ID in its key or mask it until the cache reset completes. Account-switch tests should retain the same QueryClient, hold the next account's response pending, and assert the prior account's content stays absent before and after the response resolves.
