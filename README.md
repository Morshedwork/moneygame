# LEAD Money Game

A browser-based financial learning adventure: animated lessons, a Bento business, a 20-space first quarter, reflections, and an explorable Yatai Village.

## Run

```sh
npm ci
npm run dev
npm test
npm run test:e2e
npm run build
```

Node 22 is recommended. E2E tests use installed Google Chrome. The `Practice Adventure` button runs the same deterministic rules entirely in memory, without an account or cloud saves. Refreshing clears practice. Practice never impersonates a real Firebase account.

## Firebase production setup

The client uses the supplied `lead-57c78` Firebase project. Its public web configuration is intentionally included; it is not an administrator credential.

1. Initialize Firebase Authentication and enable Email/Password.
2. Create a Cloud Firestore database. Review existing rules before replacing them.
3. Enable the billing plan required for Cloud Functions only with the project owner’s approval.
4. Sign in locally with `npx firebase-tools login`.
5. Run `npm run build:server`, then `npx firebase-tools deploy --only functions:lead-money-game,firestore:rules --project lead-57c78`.
6. Add your deployed frontend domain to Firebase Authentication’s authorized domains and test a real account.
7. Grant administrators the Firebase custom claim `admin: true` using a trusted Admin SDK environment. There is intentionally no public admin signup or browser role-escalation control.

See [architecture](docs/ARCHITECTURE.md), [rules and provisional balancing](docs/RULES.md), and [implementation report](FINAL_IMPLEMENTATION_REPORT.md) for the exact delivery and verification status. Do not assume a successful frontend deployment means Firebase was deployed.

## Blender assets

`tools/blender/build_assets.py` generates actual geometry, armature rigs, eighteen named animation clips for each of five mascots, source `.blend` files, GLB exports, collision bounds, and a manifest. No reference-image billboards stand in for 3D assets.

Set `BLENDER_PATH` to a Blender executable and run `npm run blender:build`. This workstation also has a headless Blender-module fallback documented in the implementation report. `npm run blender:validate` checks source files, GLB meshes, skins, clips, and size budgets.

The supplied Lido, Prena, Oty, and Diva illustrations guide their color, face, and crown details. Sparko is an original blue mentor with a cyan crest and LEAD hoodie.

## Structure

```text
apps/client          React + Vite + Three.js / React Three Fiber
apps/server          Firebase callable service and transaction boundary
packages/game-rules  Pure economy, progression, ledger, and multiplayer rules
packages/curriculum  Learning content, gate questions, board, and mentor text
tools/blender        Reproducible 3D asset creation
tools/validation     Asset and runtime diagnostics
tests/unit           Economy, learning gates, privacy, and idempotency
tests/multiplayer    Deterministic 2/4-player rule simulations
tests/e2e            Browser-level practice journey and auth error handling
assets/source        Editable Blender sources
public/models        Browser-ready GLBs and manifest
```

## Child-facing launch checklist

An operator must supply appropriate consent/age procedures, a real privacy contact and data-deletion process, Firebase abuse protection/App Check, budget alerts, retention policy, and a review of provisional balancing before a public child-facing launch. No public chat, purchases, behavioral advertising, or default Analytics collection is included.
