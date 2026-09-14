# Grounded character movement

The five existing LEAD characters keep their original modeled meshes and rigs.
`public/models/motion/` contains lightweight Blender-authored, rig-only Walk and
Run clips. The client replaces only those two actions; gestures, expressions,
seated poses, and other authored actions remain unchanged.

## Behavior

- Village travel accelerates and brakes, uses camera-relative input, normalizes
  diagonals, and preserves analog stick strength. Shift enables sprinting.
- Collision checks use substeps no larger than 1/120 second. Animation follows
  actual displacement, so pressing into a wall does not keep walking in place.
- Heading changes take the shortest arc and are rate-limited. The camera follows
  with damping while retaining its orbit. Blur, hidden tabs, and dialogs stop input.
- Board travel follows a distance-sampled curved path. It ramps only at departure
  and arrival, with smooth corners rather than stopping at each tile. Logical
  dice, tile, turn, and landing calculations are unchanged.
- Footfall phases follow traveled distance, adjusted for rig and display scale.
  Walk/run transitions retain their phase. A fixed 24-instance pool adds subtle
  contact dust; reduced-motion settings suppress these effects.
- NPC walks match their travel speed; idle breathing starts at varied phases.

## Blender authoring

Run from the repository root after installing the bundled headless Blender
runtime with the existing project tooling:

```powershell
node tools/blender/headless.mjs tools/blender/build_locomotion.py
```

This opens each original character source in an isolated background process,
authors stance/swing foot travel, arm opposition, body sway, and head balance,
then exports only the animation rig. It does not overwrite the original meshes
or character source files. The manifest records duration, stride, rig scale,
export size, and Blender version. The current exports total about 139 KB.

These are stylized mascot rigs, not motion-captured humans. The existing rigs
do not support a full knee/ankle inverse-kinematics system; terrain foot planting
and human-style joint articulation would require a separate rig upgrade.

## Verification

- TypeScript compilation.
- Unit tests: frame-rate consistency, collisions, bounds, analog input, braking,
  turn rates, path curvature, and unchanged logical board outcomes.
- Asset tests: all five GLBs parse, bind to their original rigs, loop seamlessly,
  contain both clips, and move a leg through the real Three animation mixer.
- Browser tests: six-step dice travel around a board corner on desktop and phone;
  exact landing and one die event; village walk/run, smooth heading, braking,
  and stopping when focus is lost. Screenshots are retained in `.runtime/`.

```powershell
node node_modules/vitest/vitest.mjs run tests/unit/locomotion.test.ts tests/unit/board-presentation.test.ts tests/unit/motion-assets.test.ts
node node_modules/playwright/cli.js test tests/e2e/locomotion.spec.ts --output=.runtime/motion-test-results
```

The separate `sanitize_source_paths.py` maintenance script fixes the audited
studio render path and unused reference-board font metadata. It reopens the
saved files and checks that object, mesh, and action counts have not changed.
