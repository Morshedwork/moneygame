# LEAD Money Game — implementation report

Date: 11 September 2026.

## Japan theme and dice update

- Actual Blender village additions: split noren curtains, shoji window lattice, ribbed wagasa umbrellas, bamboo screens, stone lanterns, festival banners and pale sakura clusters. Indigo/paper/vermillion framing preserves the supplied LEAD mascot palette. This is a Japan-inspired fictional village, not a Japanese-language localization.
- Characters, environment, twenty board spaces, die and coin have editable `.blend` sources and real exported GLB meshes. HTML labels and selection indicators remain accessible interface overlays, not substitutes for 3D models.
- One shared presentation clock now settles the trusted die result, walks each space, and only then unlocks decisions or opens final reflection. Replacement rolls display their own result without moving. Historical turns never replay on reopening the board. Reduced motion cancels the presentation immediately; loaded-scene gating and explicit text-control fallback avoid invisible cold-load rolls.
- Immediate client input lock prevents double sends; current roll commands carry expectedTurn, which the included server rules reject when stale. Firebase deployment is still required for the server change to be live.
- Regression coverage includes actual GLB pip counts and all six upward orientations, timing boundaries, final Start, repeated results, replacements, double sends, reduced motion, slow assets, and the full practice journey.
- Rebuild the village with `node tools/blender/headless.mjs tools/blender/refine_village.py`; board with `node tools/blender/headless.mjs tools/blender/build_board.py`; render saved assets with `node tools/blender/headless.mjs tools/blender/render_village.py`.

## Delivery status

**Implemented and browser-tested:** the complete unsaved practice path from landing through six lessons, three understanding checks, business creation, one complete 20-space Quarter 1, an actual-history recap, written reflection, and walking/interacting in Yatai Village.

**Implemented but not live-verified:** Firebase email/password accounts, cloud saves, parent linking and pause controls, administrator account search/pause, and private 2–4-player sessions. These need the owner's Firebase project initialized, an authorized deployment, and real-account integration tests. The client clearly labels practice; it never substitutes fake accounts or claims practice progress was saved.

**Not a finished production launch:** the backend connection and the remaining items below must be completed before inviting children to use real accounts. A published frontend does not deploy or validate Firebase.

## Client

- React, TypeScript, Vite, React Three Fiber/Three.js, and Zustand.
- Interactive original 3D landing, account forms, student dashboard, mandatory learning, business setup, board decisions, journal, reflection, village, parent/admin screens, settings and privacy information.
- Latest user-requested guidebook palette: sunshine yellow, sky blue, coral, green, lavender, white cards and dark readable text. See `docs/DESIGN_SYSTEM.md`.
- Real skinned GLBs with blended named animations, a modeled die that shows the rule result, a LEAD coin, pawn movement, desktop and touch/gamepad movement support.
- Read-only WebMCP progress inspection and navigation to the journal are feature-detected; unavailable browser support does not block play.

## Server and database

The user's direct Firebase request takes precedence over the attachment's PostgreSQL/Colyseus suggestions. The included callable service uses Firebase Auth, Admin SDK and transactional Cloud Firestore. Private player documents contain the hidden decks and RNG state. Publicly readable game views are filtered by ownership, parent links, room membership or trusted admin claims. Firestore rules deny direct client financial writes.

Gameplay actions are validated outside React. A request receipt makes retried actions idempotent. Passwords belong to Firebase Auth. Admin access requires a trusted custom claim, not self-service admin signup. Parent codes expire after ten minutes and are consumed once. Consent checkboxes and parent linking are not legal age/guardian verification.

At the last live configuration check, Firebase Auth returned `CONFIGURATION_NOT_FOUND`. No successful live signup, Firestore write, Cloud Function deployment or multi-browser Firebase session has been claimed. The server bundle compiles and loads locally; that is not proof of a deployed backend.

## Rules, board and Quarter 1

The exact 00–19 route is implemented. The core supports price 4–8, production cost 3 per successful sale, shuffled customer budgets, revenue separate from profit, failed affordability, keep/discount Big Sale, savings transfers, advertising, returns/replacement risk, personal fortunes, market effects, voluntary festival contributions, no Q1 tax, recovery liabilities and repayment. One lap stops at Start. Reflection unlocks exploration; no wealth-derived learning score is invented.

All eight Market Change and twenty Omikuji names are present. Monetary values not supplied in the brief are explicitly provisional and centralized in `packages/game-rules/content.ts`. The rule version is `q1-1.0-provisional`.

## Multiplayer

Implemented service and UI: create/join private room, capacity 2–4, readiness, ordered turns, independent businesses/finances, filtered room snapshots, preset reactions, persisted room state and idempotent actions.

Tested: deterministic two- and four-player rule simulations, turn guards, private-field filtering and retry handling.

Not tested: real browser-to-Firebase multiplayer, network disconnect/reconnect, deployed security rules and live persistence. Current shared Market Change behavior is a next-sales-opportunity approximation, not the brief's exact once-per-round shared-event expiry. Room abandonment timeouts are not implemented.

## Blender assets actually generated

Official Blender Python module `bpy 5.2.1` was executed with Python 3.13.9. A downloaded native Blender executable encountered a Windows Common Controls startup error; the official headless module successfully generated these editable sources and browser assets instead.

| Asset | Editable source | Runtime GLB | Clips |
| --- | --- | --- | --- |
| Lido | `assets/source/blender/lido.blend` | `public/models/lido.glb` | 18 |
| Prena | `assets/source/blender/prena.blend` | `public/models/prena.glb` | 18 |
| Oty | `assets/source/blender/oty.blend` | `public/models/oty.glb` | 18 |
| Diva | `assets/source/blender/diva.blend` | `public/models/diva.glb` | 18 |
| Sparko | `assets/source/blender/sparko.blend` | `public/models/sparko.glb` | 18 |
| Yatai Village | `assets/source/blender/yatai-village.blend` | `public/models/yatai-village.glb` | — |
| Die | `assets/source/blender/lead-die.blend` | `public/models/lead-die.glb` | runtime roll |
| LEAD coin | `assets/source/blender/lead-coin.blend` | `public/models/lead-coin.glb` | runtime motion |

Each mascot now has a ten-bone deform rig, including eye and mouth bones, over a continuous soft body. Clips: Idle, Walk, Run, Wave, Talk, Explain, Point, Think, Ask, Encourage, Celebrate, GentleConcern, Sit, Stand, LookAtPlayer, LookAtBoard, Serve, Interact. Blinks, speaking motion, distinct gestures and corrected vertical jumps are authored in Blender; these are not facial blend-shape or lip-sync performances.

The idempotent generator resets the scene between assets. `public/models/manifest.json` lists sources, triangle counts, sizes, clips, collision bounds and interaction anchors. Validation checks eight required assets, source existence, GLB structure, meshes, skins, expected clips and size budgets. Revision 2 uses reference-specific crowns, forelocks, smiles, wide soft stances and diagonal chest accents. Actual Blender studio renders of the four guidebook mascots are in `docs/screenshots/blender/`, including standing, gesture and blink/concern poses, plus skin-weight and movement sanity checks. A comprehensive topology/normal/texture audit remains outstanding.

## Yatai Village and performance

The village has five stalls, a food truck, bank, town hall, teaching landmark, teahouse, gate, stage, lanterns, paths, trees, gardens, bridge, stream, benches and future-area signage. It uses original geometry rather than reference-image billboards. Movement waits for collision metadata; buildings block player movement. Dialogs pause movement.

The village export is approximately 6.74 MiB, material-batched into 15 static meshes (about 127,556 triangles). Revised mascots are approximately 1.24–1.60 MiB each, with 14–29 mesh objects and 18 clips. Device pixel ratio is capped at 1.5. There is no measured representative-device FPS target claim. More character batching, LOD, camera obstruction handling and performance testing remain.

## Tests actually executed

Revision 2 verification: the five revised mascots exported successfully from Blender 5.2.1 LTS; all eight runtime assets validated; all 25 rule tests and all three browser journey tests passed again with the new models. The production client/server build passed. The four guidebook mascots also passed Blender skin-weight, vertical-hop, raised-hand and maximum-wave-edge checks, with standing, gesture and blink renders inspected. This does not change the unverified Firebase status above.

- TypeScript typecheck, Vite production build and server bundle: passed.
- Vitest: **25 tests passed**, including the mandatory 5/6/8 customer-budget examples (price 6: revenue 12, cost 6, profit 6; price 5: revenue 15, cost 9, profit 6).
- Browser tests: **3 passed** in installed Google Chrome: complete practice journey with wrong-answer retry and village stall interaction; gated village and refresh reset; mobile layout plus signup validation/error handling.
- Asset validation: all eight GLBs and corresponding `.blend` sources passed.
- Live runtime inspected in Chrome at desktop and 390-pixel mobile sizes. Browser screenshots are in `docs/screenshots/runtime/`. The signup error test uses a mocked Firebase error; it is not a live account test.
- Dependency audit at installation reported zero vulnerabilities. This is not a full security audit.
- Firefox, Safari, iOS/Android hardware, deployed Firebase rules, emulators and real network multiplayer have not been tested.
- One repeat browser run finished all game assertions but timed out while closing its browser context under concurrent build/install load. The full-journey test passed on rerun; this was retained as a test-environment reliability observation, not silently counted as a pass.

## Known gaps / not implemented

- Full customer Queue/Buy/Decline/Eat/Socialize state machine and animated outcome choreography; ambient mascot walks are not multiplayer or income sources.
- Exact multiplayer round-level Market Change semantics and abandoned-room recovery.
- Camera collision, obstruction-aware raycast interaction and cinematic event-focus camera sequences.
- Human-avatar hairstyle/skin/accessory customization (five mascot avatars are selectable).
- Full music, footsteps, ambient festival/rain and event audio; current audio is an optional synthesized click.
- Japanese translation and a complete locale extraction layer.
- Full curriculum introduction conversation/matching variation, comprehensive moderation and production content-authoring tools.
- Full admin support/deletion/export workflows, pagination beyond 200 accounts, guardian verification, retention policy, operator privacy contact, App Check enforcement and abuse/rate controls.
- Exhaustive Blender geometry validation and representative-device performance testing (studio preview renders are now included).

Future quarters, property and international economies are intentionally outside this Q1 release.

## Run and reproduce

```sh
npm ci
npm run dev
npm test
npm run test:multiplayer
npm run test:e2e
npm run blender:validate
npm run build
```

Blender with a normal installation:

```sh
# Set BLENDER_PATH to the executable if Blender is not on PATH.
npm run blender:build
```

On this workstation the ignored `.runtime` directory contains the portable Python and official bpy fallback:

```sh
node tools/blender/headless.mjs --install
npm run blender:headless
npm run blender:props
npm run blender:characters
npm run blender:render
```

The fallback runtime is not committed. Use installed Blender on another machine, or read `tools/blender/headless.mjs` for the exact local runtime paths.

Firebase owner setup and deployment steps are in the README. A real project deployment can require a billing change; no billing upgrade is assumed or performed.
