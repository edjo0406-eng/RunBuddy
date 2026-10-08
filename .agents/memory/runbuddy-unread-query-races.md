---
name: RunBuddy unread counts
description: Query race testing and prompt unread-count refresh behavior.
---

Desktop and mobile navigation use the same TanStack Query key for unread counts. A same-key query already in flight is coalesced rather than producing another polling request.

**Why:** A browser test that holds one unread-count response and waits for polling to issue another request can stall because the query client avoids duplicate work.

**How to apply:** To test a stale result arriving after a newer refresh, hold the old query function's promise, cancel the old query, run the newer refresh, and then resolve the old promise. Assert the shared cache and both badge views keep the newer count, even if the old transport ignores cancellation.

Prompt unread updates use content-free server events to invalidate only the signed-in runner's unread-count query. Keep finite polling and focus refetch enabled as recovery when an event is missed.

**Why:** Event delivery is process-local and can miss clients on another API worker or during a disconnected session; polling still guarantees eventual correction.

**How to apply:** Scope event invalidations to the generated unread-count key plus Clerk user ID. Use shared pub/sub only if immediate delivery across API workers becomes a requirement.
