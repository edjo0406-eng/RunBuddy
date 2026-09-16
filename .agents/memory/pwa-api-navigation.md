---
name: PWA API navigation exclusions
description: Preventing the RunBuddy service worker from intercepting server-owned authentication and API navigation.
---

The PWA navigation fallback must deny all `/api/*` paths. Server-owned login, callback, logout, and other API navigations must always reach the API service rather than the cached SPA shell.

**Why:** A valid production `/api/login` server route returned an OAuth redirect to direct HTTP clients, but browsers controlled by the PWA service worker received `index.html` and displayed the frontend 404 page.

**How to apply:** Whenever PWA or service-worker configuration changes, preserve the `/api/*` navigation exclusion and verify sign-in using a fresh browser context against the published app.