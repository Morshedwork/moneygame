# Money Quest v0.3 local mission

Open `/mission`, or choose **Play four-quarter Money Quest** on the home page.

This is an isolated solo-practice implementation of the supplied August 30, 2026 developer handoff. The existing account-backed Q1 game and its saves have not been migrated. This separation prevents new client-only rules from masquerading as validated server-side financial rules.

## Implemented

- Four quarters, or a configurable two-quarter short practice; each quarter has a lesson, recorded five-coin import, quarter announcement, board lap, and reflection.
- A 20-space board using the existing Blender-exported village, board, mascot, die, and coin assets. Accessible text-board fallback preserves decisions.
- Start crossing pauses at tile zero, preserves remaining die movement, then resolves the original destination under the next quarter. No Start salary or bonus turn for six.
- Four original lesson adaptations with core, deeper, and review variants. Wrong first attempts receive explanations without reducing the completion award. Selection rules use prior play evidence, not quiz correctness; rules and prompts are recorded privately.
- Forty quarter-layered Omikuji fortunes, eight decision-based Market Change cards, and the twelve-card customer-budget distribution from the handoff.
- Inventory, advertising, protected savings, Q2 tax, optional Product Growth, Q3 helper/benefit/training/absence/wages, and Q4 Save/Reinvest/Stock allocation. Squad Invest is explicitly unavailable in solo.
- Chance-result dice, price revision, recovery, loan repayment, goal interest, separate financial ledger fields, quarter histories and final reflection. Investment stake/return entries are separate from business profit.
- Browser narration initiated by the player, visible transcript text, mute, reduced motion, readable mobile layout, and a 20-term Word Bank. Narration uses the device/browser speech service; no microphone input or voice scoring is used.
- Opt-in local-browser persistence after each action, idempotent command receipts and lesson imports, seed/deck/action logs, replay support, and a stale-tab check. Practice is not a child account or research upload. There is no claim of cloud or multi-device persistence.

## Source limits and prototype choices

The DOCX is a finance-vertical developer specification, not the full textbook. Lesson prose and examples are original adaptations of its four finance lesson outlines. They are not represented as verbatim textbook content or research-approved teaching materials.

When a mandatory bill exceeds available wallet money, the unpaid portion is visibly carried as an obligation; savings remain untouched during ordinary play. At zero wallet the child chooses an explicit five-coin repayable advance or a three-coin learning recovery. At Goal, savings can settle outstanding obligations; any unpaid balance remains visible rather than being erased. These insufficient-funds defaults require product-owner review before production.

The simple lesson selector currently treats a savings decision on the prior lap as deeper-practice evidence and combines that with repeated evidence-panel use for review. It does not infer that savings was necessarily before Town Hall, does not diagnose a misconception, and is not a validated measure. No adaptability score is computed.

## Not completed or claimed

- Deployed four-quarter Firebase rules, real-account integration, approved-friend synchronisation/private lock-and-reveal, Squad Invest, host-loss recovery, and production child-safety/retention controls.
- Exact reference-matched new character anatomy, facial blend shapes, phoneme lip sync, recorded voice evidence, or new Blender assets in this change. Existing real Blender assets are reused; their current artistic limitations remain.
- Japanese localisation/furigana, fully externalised UI strings, the scripted investor demo/jump-cut launcher, all required environmental/audio effects, automatic outcome focus cameras, or a full customer state machine.
- Validated parent evidence reports or any developmental conclusions.

## Verification

Verified on this workstation on September 11, 2026: 48 dedicated rule tests passed, including replay of 30 complete seeded missions; three browser tests passed (four-quarter completion plus boundary refresh, mobile layout, and actual Blender-board loading/dice input lock). TypeScript checking and the Vite production build passed. Screenshots are under `docs/screenshots/runtime/quest-v03-*.png`. Browser narration is feature-detected but audible voice quality was not verified by automated tests.

Run `node node_modules/vitest/vitest.mjs run tests/unit/quest-mission.test.ts` and `node node_modules/@playwright/test/cli.js test tests/e2e/quest-mission.spec.ts` from the repository root. The browser tests use localhost and local practice only. A passing local test is not evidence that Firebase or production multiplayer has been deployed.

New code lives in `packages/money-quest` and `apps/client/QuestMission.tsx`. Shared changes are limited to a lazy route, home-page link, and an optional view prop for the existing board renderer.
