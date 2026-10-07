---
name: Drizzle array predicates
description: Avoid raw SQL array interpolation for PostgreSQL list membership in API routes.
---

Use Drizzle's `inArray(column, values)` for PostgreSQL list membership instead of interpolating a JavaScript array into raw SQL such as `column = ANY(${values})`.

**Why:** In this workspace, a one-runner array was rendered as `ANY(($1))` with a scalar parameter, causing real inbox requests to return 500 even though database-mocked route tests passed.

**How to apply:** For a route filtering rows by a dynamic list of IDs, use `inArray`; add a regression test with more than one conversation and verify the returned partner profiles and unread counts.
