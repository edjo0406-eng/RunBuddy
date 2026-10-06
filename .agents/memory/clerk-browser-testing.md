---
name: Clerk browser testing
description: Authenticated Playwright flows against RunBuddy's Clerk development instance.
---

For Clerk development browser tests, use the official testing token to bypass bot protection. The `+clerk_test` email pattern and test OTP suppress email delivery and verification only; they do not bypass the human-verification challenge by themselves.

**Why:** Headless sign-up stopped at Cloudflare Turnstile before it reached authentication or redirect behavior, which can look like a broken sign-in flow.

**How to apply:** Use the testing token only in development E2E. Keep production bot protection unchanged, and delete disposable test accounts from the development tenant after each run.
