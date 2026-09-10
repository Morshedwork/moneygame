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
