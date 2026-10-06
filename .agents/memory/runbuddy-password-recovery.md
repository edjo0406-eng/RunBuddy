---
name: RunBuddy password recovery
description: Mobile sign-in recovery entry-point copy and discoverability.
---

Use the explicit **Reset password** label on the mobile sign-in screen. A user testing the Android Expo Go preview did not recognize **Forgot password?** as the password-reset option, even though it was visible directly below the password field.

**Why:** Clear action wording makes the recovery path easier to find without changing the underlying Clerk reset-code flow.

**How to apply:** Keep reset access visible near the password field, label it with the action the user wants, and never attempt to reveal a stored password.
