---
name: Apple Health profile label
description: RunBuddy's Apple Health / Apple Watch profile marker does not access health data.
---

Apple Health / Apple Watch is a self-reported profile label only. It does not request HealthKit permission, import workouts, or imply a verified connection. Workout syncing would be a separate, explicitly scoped feature.

**Why:** The user chose a profile indicator rather than automatic workout syncing, avoiding implied access to private health data.

**How to apply:** Keep this option available in profile setup and editing, display it as runner-reported, and do not add HealthKit access unless the user asks for syncing.