---
name: Clerk cross-tab account changes
description: Clerk web sessions can change in one tab while other tabs retain their in-memory user state.
---

When a Clerk account changes in another browser tab, do not assume Clerk's built-in tab coordination will load the new signed-in user into an already-open React app. Sign-out propagated in browser testing, but a new account was not adopted until the other tab refreshed.

**Why:** The unread badge must not keep showing the previous account's cached count, and a per-component previous-user ref is lost when the initiating auth flow reloads the page.

**How to apply:** For web account-switch handling, keep the last known account scoped to `sessionStorage` so a reload can detect a newly loaded identity, then notify peer tabs to clear user-scoped state and refresh. Broadcast only the new authenticated identity transition; duplicate sign-out broadcasts can interrupt an in-progress sign-in.
