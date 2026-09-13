# High-quality festival graphics

Local graphics upgrade, 11 September 2026. No deployment, changes to financial rules, or replacement of the original Blender files.

## Use

Open the local game. Every 3D scene has a **Graphics** menu at its bottom right.

- **Balanced:** original lower-detail festival village, smaller render budget and shadows. Default on narrow screens.
- **High:** detailed Blender festival village, procedural cedar/stone/fabric/ground surfaces, environment reflections and stronger light separation. Default on desktop.
- **Ultra:** the same detailed assets, up to a 3840 × 2160 drawing buffer and 4096-pixel directional shadow map. Select **Full screen scene** for the largest view. Device limits and scene aspect ratio still apply; this is not a guaranteed frame rate or native 4K display.
- **Save scene image:** exports the actual current framebuffer as PNG, with its dimensions in the filename. Captures the 3D scene only, not HTML interface labels. Small portrait panels use the High budget even with Ultra selected; full-screen portraits can use Ultra.

The preference is local browser storage, independent of game saves. Changing it cannot modify coins, turns, lessons, or roll outcomes. Rolling is locked while a replacement scene is loading.

## Blender asset

`tools/blender/build_festival_hq.py` reads `assets/source/blender/yatai-village.blend` and writes separate `yatai-village-hq.blend` / `yatai-village-hq.glb` files. It preserves the buildings, board footprint and original navigation.

The new asset replaces 81 disconnected green canopy/shrub components and the original pink/pale sphere clusters with 16 branched trees, individual folded leaves, modeled five-petal sakura flowers, tapered twigs, exposed roots and low garden planting. Green roof geometry sharing the old leaf material is retained. The reproducible random seed is 841. Geometry totals are recorded in `public/models/festival-hq.json` (328,096 triangles).

Run from the repository root:

```powershell
node tools/blender/headless.mjs tools/blender/build_festival_hq.py
```

The existing official Blender Python runtime is used; no live Blender scene is controlled. Additional village districts retain their own geometry, but receive the shared lighting, render controls and applicable surface shading. Mascot geometry/rigs remain the existing reference-led Blender models; this change improves their material response and portrait lighting, not their facial rigs or likeness.

## Verification

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run tests/unit/graphics-quality.test.ts tests/unit/quest-mission.test.ts
node node_modules/@playwright/test/cli.js test tests/e2e/graphics-quality.spec.ts --trace=off --output=test-results/graphics-verification
node node_modules/vite/bin/vite.js build --outDir .runtime/graphics-build-check
```

The browser test checks the real canvas width/height (3840 × 2160), PNG download, quality changes, full-screen exit, overlay clickability, and a completed dice move. Trace recording is disabled for this graphics run to avoid large GPU capture traces; screenshots remain available.

Evidence: `docs/screenshots/runtime/festival-hq-board.png` and `festival-hq-4k.png`. The 4K export is a real game frame, not an upscaled illustration. This remains stylized 3D; it is not a photorealistic or complete character-redesign delivery.
