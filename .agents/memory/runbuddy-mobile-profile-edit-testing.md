---
name: Mobile profile edit verification
description: Device-level verification for RunBuddy runner profile edits.
---

For RunBuddy profile edits, confirm the changed field appears in the signed-in app after saving; an API success alone is not a user-visible test. On 2026-10-02, the user confirmed an Android Expo Go city edit appeared in their profile.

**Why:** A successful update response does not by itself prove that the app reflected the changed value to the user.

**How to apply:** When testing profile updates, verify the submitted field on a device after save in addition to checking the API result.

## Destructive confirmation in Expo Web

`Alert.alert` is a no-op in the installed React Native Web implementation, so it cannot confirm or invoke destructive actions in the browser preview. Use an in-app modal when the same confirmation must work on web and native.

**Why:** A native confirmation can appear correct in code while silently doing nothing in Expo's web preview.

**How to apply:** Use a modal with explicit cancel and destructive actions for account deletion or other irreversible operations.