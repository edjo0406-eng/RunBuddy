---
name: Orval and Zod compatibility
description: Compatibility constraint for generated API clients in this workspace.
---

Orval releases that generate Zod 4 APIs must not be used to regenerate clients while this workspace remains on Zod 3.

**Why:** A dependency-only Orval upgrade can pass package installation and typechecking until code generation runs, at which point generated schemas may call Zod 4-only APIs such as `z.int()`.

**How to apply:** Keep generated client files unchanged for dependency-only upgrades, or explicitly configure the generator for Zod 3 and validate the generated output before committing it.