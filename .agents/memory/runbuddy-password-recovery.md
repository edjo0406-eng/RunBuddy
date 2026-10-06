---
name: RunBuddy password recovery
description: Mobile sign-in recovery entry-point copy and discoverability.
---

Use the explicit **Reset password** label on the mobile sign-in screen. A user testing the Android Expo Go preview did not recognize **Forgot password?** as the password-reset option, even though it was visible directly below the password field.

When Clerk reports an existing active session on the sign-in route, send the user back to their profile instead of leaving them on the password form. Do not redirect during password-reset or verification steps, and do not bypass a Clerk `currentTask`.

**Why:** Clear action wording makes recovery easier to find. An active Clerk session can make a password sign-in attempt return “already signed in,” so the screen must offer a path back into RunBuddy.

**How to apply:** Keep reset access visible near the password field, use explicit action wording, and route active sessions to the profile only outside reset/verification steps and Clerk security tasks. Never attempt to reveal a stored password.
