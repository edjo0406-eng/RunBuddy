---
name: RunBuddy unread counts
description: Query race testing and prompt unread-count refresh behavior.
---

Desktop and mobile navigation use the same TanStack Query key for unread counts. A same-key query already in flight is coalesced rather than producing another polling request.

**Why:** A browser test that holds one unread-count response and waits for polling to issue another request can stall because the query client avoids duplicate work.

**How to apply:** To test a stale result arriving after a newer refresh, hold the old query function's promise, cancel the old query, run the newer refresh, and then resolve the old promise. Assert the shared cache and both badge views keep the newer count, even if the old transport ignores cancellation.

Prompt unread updates use PostgreSQL LISTEN/NOTIFY to reach SSE listeners across API processes. Keep events content-free and retain finite polling and focus refetch as recovery when an event is missed.

**Why:** Each API process has separate in-memory listeners, so immediate badge refresh must fan out through shared infrastructure while still allowing eventual correction if an event is missed.

**How to apply:** Scope each event to the authenticated runner and invalidate only that runner's unread-count query. Do not remove polling or focus refetch.
