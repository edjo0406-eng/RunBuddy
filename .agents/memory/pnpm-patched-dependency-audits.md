---
name: Patched dependency audit behavior
description: How pnpm audit reports locally patched transitive packages and persists ignore options.
---

`pnpm audit` reports advisories by the published package version and does not inspect the source changes in `patchedDependencies`. A local backport can therefore fix the vulnerable code while the audit still lists the original advisory. In this workspace, passing `--ignore` or `--ignore-unfixable` to `pnpm audit` persisted ignored IDs into `pnpm-workspace.yaml` and reserialized the file, removing explanatory comments.

**Why:** Two currently released transitive versions had no upstream fixed release, so the vulnerabilities needed local backports and regression coverage while the scanner continued to report their package versions.

**How to apply:** Keep a focused test for each local backport, explain the audit limitation, and avoid audit ignore flags unless their persistent workspace changes are intentional. Replace the backports with upstream fixed releases when available.
