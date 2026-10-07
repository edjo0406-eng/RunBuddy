---
name: Public runner discovery
description: Privacy and indexing tradeoff for runner search.
---

Public runner discovery requires explicit consent, defaulting to private. This applies to every non-owner viewer, including signed-in runners, in both directory results and profile-by-ID lookups. Owners can still view their own private profiles. Opted-in individual profiles are intended to be crawlable at their own URLs, but only as limited anonymous previews served against current consent.

**Why:** Signed-in API paths previously returned opt-out profiles, contrary to the visibility control. The SEO requirement calls for individual profile content, metadata, directory links, and sitemap entries. Build-time snapshots would keep personal data visible after a runner withdraws consent until another deployment.

**How to apply:** Filter every non-owner discovery/detail path to opt-in records, while keeping the owner's own profile available. Test the behavior for anonymous users, signed-in users, and owners; refresh mobile discovery when returning to the tab. Keep crawl-visible content limited to the anonymous allowlist. Use live consent checks and no-store responses for profiles, directory links, and the sitemap; exclude these routes from offline navigation fallbacks. Return an unavailable, noindex page for opt-outs and deletions. Search-engine and social-provider caches are outside the application's control and may take time to remove old content.