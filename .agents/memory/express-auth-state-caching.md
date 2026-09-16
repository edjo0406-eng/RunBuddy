---
name: Express auth-state caching
description: Preventing conditional requests from converting authentication-state responses into 304 responses.
---

For authentication-state endpoints, cache-control headers are not enough to prevent Express freshness negotiation. A conditional request can still become `304` when the response is sent through the normal JSON/ETag path.

**Why:** A cached `304` auth response can leave the browser with stale unauthenticated state and send users back through login repeatedly.

**How to apply:** Return auth-state JSON without the standard ETag-aware `res.json` freshness path, and keep regression coverage for both ordinary and conditional requests.