# Architecture and trust boundaries

The production client authenticates with Firebase Auth, then calls the `leadAction` callable. Firebase verifies identity; server code checks roles, validates actions, and mutates Firestore in transactions. The browser never supplies trusted dice results or wallet balances.

`players/{uid}` is server-only. It contains hidden decks, RNG state, idempotency receipts, attempts, and economy data. `views/{uid}` contains a filtered owner/linked-parent/admin snapshot. Firestore rules deny all client writes. `roomViews/{code}` contains only public room information and member identity, avatar, position, readiness, and preset reactions. It never includes wallets, ledgers, reflections, or future cards.

Parent invitation codes are 48 random bits, expire in ten minutes, and are consumed transactionally. A student must share the code with their parent. This is an access-linking mechanism, not legal age verification. Admin claims are assigned externally by a trusted administrator; selecting a signup role cannot create an admin.

Production game transitions use a cryptographically generated initial seed persisted only in the private document, deterministic deck shuffling, and server transactions. Request IDs make retries idempotent. Firebase Auth handles passwords; the application never stores them in Firestore.

The frontend is statically hosted on Sites. Firebase Cloud Functions and Firestore must be deployed separately. Firebase web config alone cannot initialize Authentication, deploy functions, grant roles, or authorize a new hosting domain.

Practice mode is deliberately separate: an in-memory player in the current tab, prominently labeled unsaved, using the same pure rules. Practice is not authoritative, is not synchronized, and never uploads progress. Its existence does not weaken the production callable or Firestore rules.

The village loads a Blender-authored static material-batched GLB. Characters use skinned GLB clones and animation mixers. The player uses camera-relative WASD/arrows or touch/gamepad input, acceleration, per-axis AABB collision, bounded world position, a following orbit camera, and proximity interactions. Decorative NPCs follow small local loops. This is a compact explorable village, not a streaming MMO.

Audio is a short synthesized click cue, off by default. Reduced-motion preference follows the OS initially and can be changed for the current session. The UI remains usable if a WebGL scene fails. Two feature-detected WebMCP tools read visible progress and navigate to the existing journal; they cannot grant rewards or bypass gates.

## Operational hardening still required

- Firebase App Check enforcement, verified-email policy, invitation/room rate limiting, bounded retention and audit history.
- Server-side time limits if a daily play-time policy is introduced. Current parent controls pause/resume only.
- Administrative pagination beyond the first 200 accounts, support workflows, deletion/export endpoints, and content authoring/version approval.
- Deployment-specific real Auth/Firestore/Functions integration tests and 2/4-browser live multiplayer tests.
- Room reconnect/abandonment timeout and more sophisticated shared-market round expiry.

There is no service-account key, deployment token, or admin password in this repository.
