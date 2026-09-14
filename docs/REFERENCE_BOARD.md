# Reference village board

The Money Quest board uses a dedicated 3D village modeled from the supplied
visual reference. Its twenty numbered spaces have mesh lettering and icons,
rounded porcelain faces and golden bases. Striped market kiosks, bento meals,
cedar fences, lanterns, faceted trees, a food truck, stream, bridge and village
gate surround the route. The game retains the existing twenty tile positions.

The `/mission` board stays visible throughout lessons, decisions and outcomes.
Sparko guides each turn in a short conversation beside the board, or below it on
phones. **Roll the dice** moves the pawn 1–6 spaces. The landing space opens its
business decision or customer result; choices such as a price change, saving,
advertising or a refund require a reason. The die settles before the pawn walks,
and the decision or result appears after arrival. **Next roll** continues from
the resolved event.

The route includes sales, market changes, fortune cards, promotions, saving,
returns and community decisions. Customer results show the recorded revenue,
production costs, wages and profit; the coin history retains every transaction.
Actions and reasons are saved locally and replay-validated. Parent reports show
lesson evidence, decisions and reflections, with earlier choice-journal sections
when those events exist. They open only when requested through
**Mission tools → Parent learning report**. No chart or modal opens after a move.

## Dice turns and saved progress

The `roll-dice` action draws one authoritative movement result from the mission's
seeded random stream. The 3D die, accessible result text and pawn path all use
that accepted event; animation never generates another number. Duplicate actions
and stale turns cannot draw or move again. The next roll waits for the current
event to finish and for the scene to load, unless the player selects the text
board.

The board die and the six-faced close-up share a 1.7-second tumble, bounce and
settle animation, followed by a half-second hold on the accepted result before
the pawn leaves. The clock pauses when the tab is hidden or scene assets are
loading. Reduced motion and the text board show the accepted result immediately.

Reaching Start pauses at space 0 for reflection and the next quarter's lesson.
Unused steps remain in the save and resume after the lesson deposit and planning
offers, with no extra movement die or turn. The final lap instead ends in
settlement. Replacement, stock and other chance rolls resolve their own event
while the pawn stays put. If a stock roll and saved movement occur in the same
planning action, the chance result is shown before those already-owed steps.

Historical `roll` actions and the live `roll-dice` action use the same seeded
movement rules, so existing dice saves can finish their current step and continue.
Reloading restores the saved position and outcome; it does not reroll or replay
finished movement.

## Editable assets

- `assets/source/blender/lead-money-quest-reference.blend`: complete composed
  scene with four rigged mascots, camera and lighting.
- `public/models/lead-money-quest-reference.glb`: portable complete scene.
- `assets/source/blender/yatai-board-village.blend`: dedicated scenery.
- `assets/source/blender/yatai-reference-board.blend`: tile and bench meshes.

The live game loads the separate board and village GLBs to keep its mascots
animated and its board movement authoritative. The composed GLB is an export
for viewing and editing, with a posed board arrangement. The board and village
are modeled geometry; the reference screenshot is not a backdrop or texture plane.

## Animation and learning

The live board includes a moving pawn halo, pulsing active tile, landing rings,
river ripples, drifting petals, food steam and lantern glow. Characters react to
sales and losses while the pawn walks through every space in the accepted path.
The real rig's Walk clip is sampled from the same visible clock as the pawn
position. The clock pauses while the tab is hidden or the scene is unavailable,
and limits delayed-frame advances so movement stays visible. Results wait until
landing.
Switching to reduced motion or the accessible text board finishes the current
presentation permanently without drawing again or repeating the decision.

Click a board space or choose **Explore** to read its learning guide.
All twenty spaces are available through keyboard-accessible buttons. Orbit
drags do not open a guide; the **Reset board view** button restores the
fitted camera. Guides never move the pawn or change mission finances.

**Try with practice coins** opens Sparko’s independent animated examples for prices and customer
budgets, savings and returns, helper wages, and saving/reinvestment/stock outcomes.
Its example coins are separate from the mission wallet. The labs support mobile
layouts, keyboard inputs and reduced motion.

Validation lives in `tests/e2e/mission-dice.spec.ts`,
`tests/e2e/board-walking.spec.ts`, `tests/e2e/board-experience.spec.ts`,
`tests/e2e/lesson-lab.spec.ts`, `tests/e2e/quest-mission.spec.ts` and
`tests/e2e/choice-journey.spec.ts`. The full journey test completes four dice-driven
laps and checks movement events, reasoned decisions, all four lesson deposits,
ledger balances, reload, reflections and the parent report.
`tests/unit/mission-dice.test.ts` covers the replay-safe dice transition,
duplicate and stale actions, boundary remainder and nonmoving replacement dice.
`tests/unit/mission-journey.test.ts` checks seeded mission replay, accounting,
lesson gates, held steps, recovery and final settlement.

## Rebuild

From the project root, with the existing portable Blender runtime installed:

```powershell
node tools/blender/reference-scene.mjs
```

This creates the two component models, assembles the complete scene, and renders
`docs/screenshots/blender/reference-board.png`. Individual scripts can also run
through `tools/blender/headless.mjs`. This workflow preserves the original
explorable village assets.
