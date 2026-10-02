---
name: GitHub private required checks
description: Constraints observed when using the workspace's GitHub connection for workflow uploads and required merge checks.
---

For the connected GitHub setup, a branch-protection request on a private repository returned an explicit upgrade-to-Pro or public-visibility restriction. Never change repository visibility without the user's explicit approval.

Writes to `.github/workflows/...` failed with opaque proxy/GitHub responses rather than a structured missing-scope error. The provider-declared reauthorization scopes did not include a workflow scope, so do not assume reconnecting will fix this.

**Why:** Repeated requests cannot resolve plan restrictions, and opaque workflow-write failures do not establish that reauthorization will help.

**How to apply:** Check the authorization context and exact provider response before retrying. Offer reauthorization only for a clear authentication or missing-scope failure with a matching returned scope. For private required checks, ask the user to choose a supported plan or explicitly approve a visibility change. For bulk uploads, initialize an empty repository with a first commit, batch tree writes, and avoid parallel blob bursts.