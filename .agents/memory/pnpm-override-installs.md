---
name: Workspace override installs
description: Keep installed workspace dependency trees synchronized after changing pnpm-wide overrides.
---

After changing a dependency override in `pnpm-workspace.yaml`, run a full `pnpm install` before verifying installed versions. Filtered `pnpm add` commands can update the shared lockfile while leaving unselected workspace packages' installed links stale.

**Why:** The lockfile and audit report showed the patched version while `pnpm why` in unselected workspace packages still showed the old vulnerable version. A full install synchronized all workspace packages.

**How to apply:** When an override changes, use a workspace-wide install after any filtered package updates, then verify both the lockfile and `pnpm -r why <package>` output.