---
name: RunBuddy unread-query race tests
description: Test late unread-count responses when desktop and mobile share a query key.
---

Desktop and mobile navigation use the same TanStack Query key for unread counts. A same-key query already in flight is coalesced rather than producing another polling request.

**Why:** A browser test that holds one unread-count response and waits for polling to issue another request can stall because the query client avoids duplicate work.

**How to apply:** To test a stale result arriving after a newer refresh, hold the old query function's promise, cancel the old query, run the newer refresh, and then resolve the old promise. Assert the shared cache and both badge views keep the newer count, even if the old transport ignores cancellation.
