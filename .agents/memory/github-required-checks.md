---
name: GitHub private required checks
description: Constraints observed when using the workspace's GitHub connection for workflow uploads and required merge checks.
---

For the connected GitHub setup, a branch-protection request on a private repository returned an explicit upgrade-to-Pro or public-visibility restriction. Never change repository visibility without the user's explicit approval.

Writes to `.github/workflows/...` failed with opaque proxy/GitHub responses rather than a structured missing-scope error. The provider-declared reauthorization scopes did not include a workflow scope, so do not assume reconnecting will fix this.

**Why:** Repeated requests cannot resolve plan restrictions, and opaque workflow-write failures do not establish that reauthorization will help.

**How to apply:** Check the authorization context and exact provider response before retrying. Offer reauthorization only for a clear authentication or missing-scope failure with a matching returned scope. For private required checks, ask the user to choose a supported plan or explicitly approve a visibility change. For bulk uploads, initialize an empty repository with a first commit, batch tree writes, and avoid parallel blob bursts.

GitHub may run a `pull_request` workflow from the PR branch that introduces the workflow file. Inspect the actual run and required-check state before temporarily weakening branch protection.

**Why:** The workflow-bootstrap PR in this repository produced a passing Actions run on its head branch. Removing the required check before confirming whether that run could satisfy the rule created an avoidable protection gap.

**How to apply:** When bootstrapping a workflow under an existing required-check rule, first let the PR check start and inspect its status. Only temporarily remove the exact required context if GitHub blocks the merge for a missing check, and restore it immediately.

The connected GitHub app can read repositories, pull requests, Actions runs, and Git objects while Git write requests may still return a generic 404 even when repository metadata reports push access.

**Why:** On 2026-10-07, a temporary CI-verification branch could not be created: Git tree writes returned 404 through both the connector proxy and GitHub SDK, before any branch or pull request was created.

**How to apply:** Before planning a live CI proof, confirm the workflow change is present on the remote base branch. If both supported write paths return 404, stop and ask the user to push or create the test branch through their normal GitHub workflow; do not retry random write endpoints or alter `main` or branch protection.