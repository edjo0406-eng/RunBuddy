---
name: Public runner discovery
description: Privacy and indexing tradeoff for runner search.
---

Public runner discovery requires explicit consent, defaulting to private. The indexable directory landing page describes discovery, but individual profiles are not intended to rank through build-time snapshots of personal data.

**Why:** Static profile HTML would keep personal data visible after a runner withdraws consent until another deployment; anonymous results must reflect opt-out immediately.

**How to apply:** Keep anonymous discovery limited to opt-in records with an allowlisted field selection. Public search filters must also use only consented fields: filtering on hidden travel locations reveals them indirectly through result membership. Do not pre-render identifiable runner names or locations at build time unless revocation is also handled immediately.