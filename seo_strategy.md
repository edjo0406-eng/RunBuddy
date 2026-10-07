# SEO Strategy

## In scope
- Public RunBuddy discovery and marketing pages (`/`, `/run-buddy`, `/run-date`)
- Runner profiles only when the runner explicitly opts into public listing

## Out of scope
- API endpoints and authenticated/private user workflows
- Non-opted-in runner profiles, private messaging, and contact information
- Internal design canvas

## Target audience
- Runners seeking running partners

## Primary keywords
- Find running partners
- Running buddy

## Crawler assumptions
- Public pages should be visible to search, social preview, and AI crawlers without requiring client-side JavaScript.
- Vite generates static HTML for the three public marketing routes; opt-in runner data is served by the public API but currently requires JavaScript to appear as page HTML.

## Dismissed categories
- (None yet)
