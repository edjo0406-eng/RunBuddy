---
name: RunBuddy browser visibility testing
description: Reliable tab background/resume tests in the workspace's headless Chromium.
---

In this workspace's headless Chromium, opening another Playwright page does not reliably make the tested page report `document.visibilityState === "hidden"`. The available browser also lacks the `Emulation.setPageVisibilityState` CDP command.

**Why:** Focus-refetch tests can time out before exercising the app if they rely on real tab switching to emit a visibility change.

**How to apply:** For browser tests of visibility-driven refreshes, use a test-only `document.visibilityState` override and dispatch `visibilitychange` for hidden and visible transitions. Restore the visible state and remove the override during cleanup.
