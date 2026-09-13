# Japanese bento shop setup

The business setup screen now uses a complete original Blender shop, rather than a floating character portrait and an HTML sign. The layout gives the interactive scene more space while retaining the LEAD character palette and existing account/setup workflow.

- Three detailed bento trays, food geometry, chopsticks, napkins, and soy sauce.
- Cedar cabinet and floorboards, shoji side screen, open shelves, bowls, tea tins, jars, takeaway boxes, tea set, onigiri prep station, produce crate, flowers, and ribbed lanterns.
- Two independently modeled roof halves. The front roof is hidden initially to reveal the shop; the roof control shows the full tiled roof.
- Three resettable camera compositions: whole shop, bento counter, and inside the shop. The interior view temporarily removes the front sign/curtains so the shelf items are unobstructed. Drag and zoom are also available.
- Business name and price are live canvas text textures on Blender mesh labels. Banner changes affect the noren material. The selected existing rigged character stands beside the counter.
- Existing setup and profile commands are unchanged. Preview items are decorative, not inventory purchases. No Firebase, authentication, board, or wallet rules were changed for this screen.

## Rebuild the asset

From this repository:

```powershell
node tools/blender/headless.mjs tools/blender/build_shop_showroom.py
```

Source: `assets/source/blender/bento-showroom.blend`.
Runtime: `public/models/bento-showroom.glb` (~2.9 MB / 54,992 triangles).
Metadata: `public/models/bento-showroom.json`.
Actual Blender composition render: `docs/screenshots/blender/bento-showroom.png`.
Close-up renders: `docs/screenshots/blender/bento-showroom-counter.png` and `docs/screenshots/blender/bento-showroom-inside.png`.

The model contains genuine meshes, no flattened reference image. The character is loaded separately from the existing character assets. A shared geometry cache is retained; preview materials and dynamic textures are instance-owned and disposed on replacement.

## Checks

`tests/unit/shop-showroom.test.ts` checks Blender provenance, editable mesh/material names, detailed inventory, size budget, and responsive camera framing. No browser interaction or screenshot test was requested for this local visual update.
