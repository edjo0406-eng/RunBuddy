---
name: Mobile profile edit verification
description: Device-level verification for RunBuddy runner profile edits.
---

For RunBuddy profile edits, confirm the changed field appears in the signed-in app after saving; an API success alone is not a user-visible test. On 2026-10-02, the user confirmed an Android Expo Go city edit appeared in their profile.

**Why:** A successful update response does not by itself prove that the app reflected the changed value to the user.

**How to apply:** When testing profile updates, verify the submitted field on a device after save in addition to checking the API result.