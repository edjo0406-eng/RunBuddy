---
name: Orval and Zod compatibility
description: Compatibility constraint for generated API clients in this workspace.
---

Orval releases that generate Zod 4 APIs must not be used to regenerate clients while this workspace remains on Zod 3.

**Why:** A dependency-only Orval upgrade can pass package installation and typechecking until code generation runs, at which point generated schemas may call Zod 4-only APIs such as `z.int()`.

**How to apply:** Keep the generator pinned to a Zod 3-compatible release, or explicitly configure it for Zod 3 and validate generated output before committing it. In particular, newer Orval releases may emit `z.email()` and `z.url()` even when the source spec is unchanged.