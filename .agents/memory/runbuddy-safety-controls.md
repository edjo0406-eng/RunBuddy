---
name: RunBuddy safety controls
description: Agreed behavior for unfriend, block, and report actions.
---

Unfriending removes only the connection; it does not delete messages. Blocking removes the pair's connection requests and accepted connection, prevents signed-in discovery and messaging in either direction, and hides existing conversations without deleting their message records. An opted-in public profile may still be visible to signed-out visitors. Unblocking removes the block but never restores the connection.

Reports are retained as pending records until reviewed, and are removed if either involved account is deleted, consistent with full account deletion.

**Why:** Users need immediate separation without losing message context, while public-profile visibility remains governed by the runner's separate opt-in. Reports should persist for review without outliving either account.

**How to apply:** Keep these rules consistent across web and mobile, API authorization, discovery, connections, inbox access, and future moderation tooling.