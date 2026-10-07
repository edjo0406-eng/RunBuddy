---
name: RunBuddy mobile screen testing
description: Test Expo screen behavior in the RunBuddy workspace without requiring Metro or native devices.
---

For Expo screen tests in this workspace, use Vitest with React Test Renderer and focused React Native/API mocks unless a React Native test environment is explicitly configured.

**Why:** A plain Node Vitest run cannot parse React Native 0.86's Flow-based source that React Native Testing Library loads, while Metro handles those modules normally.

**How to apply:** Render the real screen components under a real React Query provider, mock device-specific widgets and API hooks, and assert rendered actions and refreshed query state.
