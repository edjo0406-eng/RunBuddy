---
name: RunBuddy mobile build port
description: Local Metro port conflict between the static Expo build and the component-preview service.
---

When verifying the Expo static build locally, the component-preview workflow may already own Metro's default port 8081. Stop that preview workflow for the build; this local conflict is separate from the isolated deployment build.

**Why:** A local mobile build timed out after Expo prompted to switch ports in the non-interactive build process, while the same static build succeeded once the component preview released port 8081.

**How to apply:** Before diagnosing a local Expo bundle failure, confirm whether port 8081 belongs to the mobile server or the component-preview service. Revisit this note after the build script is changed to avoid the collision.
