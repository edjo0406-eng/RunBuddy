---
name: Website account-switch testing
description: Regression-test user-scoped website UI through a real account change.
---

For user-scoped website UI, test the transition from an account with cached data to a different signed-in account while the new account's request is still pending. Assert the prior account's data is absent both during loading and after the response, including the no-data response.

Treat a failed user-scoped query as unusable even when React Query retains stale data from a previous successful response. Navigation must not infer either a profile link or profile setup from data attached to an error state; cover recovery on a later successful retry.

**Why:** Assertions made only after the new request succeeds miss brief exposure of the previous account's data during an account switch.

**How to apply:** Use a real auth-provider account transition, preserve the same app/query-cache lifetime, and delay the second account's response long enough to inspect the loading state. Also test an error state with stale profile and no-profile data, then verify recovery.
