---
name: Website account-switch testing
description: Regression-test user-scoped website UI through a real account change.
---

For user-scoped website UI, test the transition from an account with cached data to a different signed-in account while the new account's request is still pending. Assert the prior account's data is absent both during loading and after the response, including the no-data response.

For cross-tab conversation changes, also hold a previous-account conversation response until the new account's conversation is visible, then release it and confirm the old message never returns.

Treat a failed user-scoped query as unusable even when React Query retains stale data from a previous successful response. Navigation must not infer either a profile link or profile setup from data attached to an error state; cover recovery on a later successful retry.

**Why:** Assertions made only after the new request succeeds miss both brief exposure during loading and a late old-account response that settles after the switch.

**How to apply:** Use a real auth-provider account transition and preserve the same app/query-cache lifetime. Delay the new account's response to inspect loading, then release a held previous-account conversation response after the new thread loads. Also test an error state with stale profile and no-profile data, then verify recovery.
