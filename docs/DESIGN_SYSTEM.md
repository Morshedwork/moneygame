# LEAD guidebook theme

The supplied Oty, Prena, and LEAD guidebook images define the current theme. This supersedes the earlier predominantly blue direction.

| Color | Value | Role |
| --- | --- | --- |
| Sunshine | `#FFDE00` | Oty, rewards, practice notice |
| Sky | `#52A7DA` | Prena, learning, savings |
| Coral | `#F96366` | Lido, leadership accents |
| Leaf | `#6DBA32` | Diva, growth, family section |
| Lavender | `#B698F5` | Borders, selection, learning progress |
| Deep lavender | `#6847B5` | Primary actions with white text |
| Ink | `#27263F` | Readable text on bright fills |
| Secondary ink | `#645C75` | Secondary text on light surfaces |

`apps/client/theme.ts` supplies 3D mascot materials and banner choices. `lead-theme.css` applies the corresponding UI palette after the base layout stylesheet. White panels keep longer learning and financial content quiet. Bright fills use dark text; white text is reserved for deep action colors. Semantic retry/success states also have explicit wording and icons.

Main reading copy stays at 1rem, common controls at 0.875rem, and secondary metadata at 0.75rem. Compact die/board labels are scene-space annotations that can be enlarged with the board camera. Native keyboard focus remains visible. Reduced motion is available in Settings. No timed financial choices, public chat, or default audio playback are used.

## Reference-led Blender art, revision 2

The visual thesis is **the guidebook mascots brought into 3D**, not a replacement character brand. The Sites building skill's existing-brand and consistent-motion guidance informed this refinement. Original geometry is authored in `tools/blender/reference_mascots.py`, saved as editable `.blend` sources, and exported to the same runtime GLB paths used throughout landing, lessons, board and village.

- Lido: coral body, asymmetric red forelock, lightbulb stalks, broad toothy smile.
- Prena: sky-blue body, rounded blue fringe, large inner blue/coral gears and smaller outer green/yellow gears, with actual open centers.
- Oty: sunshine body, orange lightning fringe, two large yellow crown stars behind four small colored stars on orange stems.
- Diva: leafy body, arched green fringe, extruded jigsaw pieces with concave sockets as well as tabs.
- Sparko: blue coach, flame crest, LEAD hoodie details, same soft-body movement system.

Continuous soft silhouettes replace separated torso/mitten/leg primitives. Each model has a ten-bone deform rig, including eyes and mouth. The 18 stable named actions now include blinking, speaking motion, distinct explanation/question/pointing gestures, a visible raised-hand wave, and a vertical celebration hop. This is stylized skeletal facial motion, not a facial blend-shape or lip-sync system.

Palette hex values are converted from sRGB to linear values when creating Blender materials. Matte highlights, simple black pupils and white smiles preserve the guidebook character identity. Portrait cameras leave space for crown tips and raised-arm motion. Landing mentor gestures differ by role.

`npm run blender:characters` regenerates characters without changing the village. `npm run blender:render` renders real saved Blender assets into `docs/screenshots/blender/` and checks normalized skin weights, clip counts, upward jumps and raised-hand deformation. Those renders are validation evidence, not image planes or substitute gameplay assets.
