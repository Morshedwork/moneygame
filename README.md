# LEAD Money Game

A browser-based financial learning adventure: animated lessons, a Bento business, a 20-space first quarter, reflections, and an explorable Yatai Village.

The `/mission` experience keeps its animated 3D board visible while Sparko teaches
through a short conversation beside it. Roll the dice to move 1–6 spaces, then
resolve the business event where you land. The seeded rules engine supplies the
same result to the visible die, pawn movement, and saved journal. Replacement and
stock chance rolls do not move the pawn. Unused movement at Start resumes after
the next quarter's lesson and planning, without another roll. Existing dice
journals remain replayable. Parent reports are available on request from Mission
tools. See the [reference board guide](docs/REFERENCE_BOARD.md) for turn flow,
save compatibility, and assets.

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

`tools/blender/build_assets.py` generates the village and props. `npm run blender:characters` runs `refine_characters.py`, which dispatches through `reference_mascots.py` to `source_mascots.py` for Lido, Prena, Oty, and Diva. `reference_pixels.py` measures the supplied PNGs to retain their front outlines, proportions, and colors. The builder adds rounded depth and closed backs, uses vertex colors for the original body panels, and adds modeled faces and crowns from `reference_face.py`. These are rigged 3D meshes used for portraits, board pawns, shopkeepers, and village characters. Sparko retains its original 3D model.

Editable individual `.blend` files are in `assets/source/blender`; the game loads their GLB exports from `public/models`. `npm run blender:render` assembles the editable studio at `assets/source/blender/LEAD-characters-3D.blend` and renders front and turnaround views. `npm run blender:validate-characters` checks the character exports. Set `BLENDER_PATH` to a Blender executable when needed; this workstation also has the headless Blender-module fallback documented in the implementation report. `npm run blender:validate` checks the broader asset set.

The 16 supplied PNGs retain their original pixels in `public/characters/source` as design references; identifying export metadata is removed before public serving. The models preserve the supplied front design while adding volume; their appearance changes with viewing angle and 3D lighting. Portraits start in the standing pose on the character-selection screen and use neutral white lighting with preserved Blender materials. Drag the interactive WebGL canvas to inspect the model from another angle. The same GLBs provide walking, talking, celebrating, and sitting animation. Versioned model URLs fetch updated exports, and a failed model load offers a retry without losing learning or board progress.

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
