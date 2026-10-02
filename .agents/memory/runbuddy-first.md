---
name: RunBuddy-first product direction
description: Product hierarchy decision for the RunMatch community app.
---

RunBuddy is the sole product experience and public entry point. The homepage and browsing pages must remain publicly visible; require sign-in only for private actions such as joining, inbox, and messaging.

**Why:** The product is focused on finding running companions for local and travel runs. Visitors opening the app URL need to see the product before deciding to sign in.

**How to apply:** Future homepage, navigation, onboarding, copy, and promotional changes should lead with RunBuddy. Never wrap the entire frontend router in an authentication gate.

## Runner app links and trust

Runner profiles should preserve and show the running-app links that members provide, so signed-in runners can inspect them before deciding to connect. These links are self-reported and must not be presented as formal verification.

**Why:** The user wants to use Strava and similar profiles to judge whether a potential running buddy appears genuine and to reduce scam risk.

**How to apply:** Keep running-app links through unrelated profile edits, show valid external links to signed-in profile viewers, and label them as runner-provided rather than verified.