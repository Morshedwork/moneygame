# Production gates — 11 September 2026

This is a verification checklist, not a production-ready claim. Practice is explicitly unsaved. Never substitute practice fixtures for real account, persistence or security tests.

| Gate | Verified evidence | Still required |
| --- | --- | --- |
| Blender models and Japan theme | Nine required runtime GLBs have real meshes and editable `.blend` sources; five mascots each have rigs and 18 clips. Village, board, die and coin are also Blender assets. | New village/mission work in this checkout requires its own validation; device performance and a comprehensive geometry audit remain. |
| Dice, money and learning | 43 unit/rule tests passed, including six actual GLB face orientations, roll/walk timing, completed-lap handling and five room-departure regressions. Previous release passed eight practice browser tests. | Approve provisional monetary values; exact shared-round Market Change timing and reconnection/failure cases. |
| Real authentication and saves | Client and callable implementations exist. Read-only public Auth configuration returned HTTP 400 `CONFIGURATION_NOT_FOUND` on 11 September JST. Firebase project-list authorization returned HTTP 401. | Owner reauthentication, Email/Password configuration, authorized frontend domain, Firestore/Functions deployment, real signup/login/reset and cross-device save verification. |
| Parent/admin security | Direct client writes are denied; hidden decks are server-only; admin access uses a trusted claim; parent reads require server-maintained links. Static rule audit is in `SECURITY_RULES_AUDIT.json`. | Emulator deny/allow tests and deployed rule tests; verified guardian procedure, unlink/deletion/retention workflow, operator contact, abuse controls. A checkbox is not guardian verification. |
| Multiplayer | Pure 2–4 player simulations, actor guards and request idempotency tested. Finished-player departure now preserves the current actor by ID. | Live multi-browser sessions; uncertain-response retries retaining the original request ID; disconnect/rejoin tests; owner-approved pause/abandonment policy. |
| Release | Blender/dice release `092de78` was built and pushed to GitHub; Sites version 3 was saved, not deployed. | A clean integrated build after concurrent mission/village edits settle, representative-device browser tests, real backend verification, explicit approval before replacing the public Site. |

## Blocking owner actions

1. Reauthenticate Firebase locally as an owner of `lead-57c78`. Do not paste passwords, refresh tokens or service-account keys into chat.
2. Confirm the project's existing billing state and approve any required billing change before Cloud Functions deployment. No upgrade or new spend is authorized by this checklist.
3. Choose the multiplayer recovery policy: how long a disconnected player keeps their turn, what happens to a pending decision, and how others may continue after a parent pauses a player. Do not silently invent financial outcomes or bypass a parent's pause.
4. Review the provisional amounts in `packages/game-rules/content.ts`. The reference explicitly describes advertising as **additional** visitors; its prompt should say “extra” consistently. The reference specifies only one shared Market Change per round; the current next-sale implementation does not meet that requirement.
5. Approve public publication separately. The latest saved Sites version has not replaced the existing public version.

## Scope and concurrent work

The supplied brief specifies Quarter 1 as the only fully playable financial quarter. Its implemented endpoint is reflection followed by village exploration. Newly added four-quarter mission and district files are concurrent work and were not included in the nine-asset/43-test verification above. Do not treat them as verified or include them in a release merely because they appear in the shared working directory.

## Source checks found in this pass

- Fixed: removing a finished member used to shift the numeric turn index onto another player. The transition now preserves a still-active actor, skips completed seats where needed, uses transaction-fresh player state, and retains the active-player leave restriction.
- Fixed: an ambiguous cloud failure no longer claims that progress definitely did not change. The UI now asks the player to reconnect and check progress.
- Open: authentication snapshot errors are swallowed; interrupted profile provisioning and stale auth callbacks need recovery tests.
- Open: the UI currently creates a fresh command ID on each manual retry, although the server accepts idempotent retries of the same ID.
- Open: paused/abandoned current players can block a room. Product policy is required before implementing automatic continuation.

The Firebase checks were read-only. No accounts, deployed database rules, billing settings or live functions were changed.
