---
name: RunBuddy Android tabs
description: Confirmed Android bottom-tab sizing behavior in the Expo simulator.
---

**Rule:** Keep Android bottom-tab height, bottom safe-area padding, and label visibility explicit; do not rely only on navigator defaults.

**Why:** The Android simulator initially did not show the four bottom tabs even though iOS and web did. After explicit Android sizing and a simulator refresh, the user confirmed Discover, Connections, Inbox, and Profile were all visible.

**How to apply:** If tabs disappear on Android again, first confirm the simulator has refreshed the current bundle and inspect Android safe-area sizing before changing iOS or web tab behavior.
