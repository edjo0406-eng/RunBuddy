---
name: Expo Go auth testing
description: Expo Go limitations for OAuth callbacks that depend on an app-specific URL scheme.
---

Expo Go cannot verify OAuth or OpenID Connect redirects that depend on an app-specific URL scheme. A native development build is required for that callback test.

**Why:** Expo Go uses its own generic app scheme and cannot register a project's custom native scheme.

**How to apply:** Use Expo Go for RunBuddy email/password authentication and ordinary app flows. Mark Google OAuth callback testing as unverified unless it is exercised in an iOS or Android development build.