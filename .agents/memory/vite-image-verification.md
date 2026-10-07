---
name: Vite image verification
description: Avoid false positives when measuring image delivery in the development preview.
---

Distinguish development asset-import JavaScript wrappers from actual image transfers.

**Why:** Vite can request a legacy PNG URL with `?import` while loading modules for unrelated routes, even though the public page renders only optimized WebP images. Treating those module requests as PNG photography downloads gives a false failure.

**How to apply:** Verify rendered images' `currentSrc`, decoding success, and image-initiated resource requests; inspect the production build separately when measuring total delivered bytes.
