---
name: Public runner discovery
description: Privacy and indexing tradeoff for runner search.
---

Public runner discovery requires explicit consent, defaulting to private. This applies to every non-owner viewer, including signed-in runners, in both directory results and profile-by-ID lookups. Owners can still view their own private profiles. The indexable directory landing page describes discovery, but individual profiles are not intended to rank through build-time snapshots of personal data.

**Why:** Signed-in API paths previously returned opt-out profiles, contrary to the visibility control. Static profile HTML would also keep personal data visible after a runner withdraws consent until another deployment.

**How to apply:** Filter every non-owner discovery/detail path to opt-in records, while keeping the owner's own profile available. Test the behavior for anonymous users, signed-in users, and owners; refresh mobile discovery when returning to the tab. Keep anonymous results limited to allowlisted fields, and do not pre-render identifiable runner data unless revocation is handled immediately.