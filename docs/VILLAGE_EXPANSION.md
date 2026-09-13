# Yatai Village expansion

Local feature addition: three selectable districts, eleven replayable activities,
five scripted NPC mentors, a session-only stamp passport, and player-relative
wayfinding. The existing first-quarter/reflection village unlock is retained.

## Destinations

| Map | Activities | Environment |
| --- | --- | --- |
| Festival Market | Bento orders, budget planning, community choices, kindness, rhythm | Existing Blender festival village |
| Sakura Riverside | Thoughtful picnic, tea-house service, river-care sorting | New Blender sakura grove, footbridge, tea pavilion, bamboo and river |
| Lantern Craft Lane | Lantern color sequence, paper-fan sequence, maker pitch | New Blender timber workshops, shoji, noren, folded fans and lantern strings |

Choose a map above the 3D viewport. Choose **Show me where** in the passport for
a marker, direction arrow and distance. Walk with WASD/arrows or the touch pad;
drag to look; Shift to run; E or the interaction prompt opens chat/activity.
Activities are untimed and retryable. Collect a stamp only after completing all
steps. Replay does not duplicate stamps or affect board-game money.

## Dialogue and data boundaries

**Mentor chat is scripted NPC dialogue, not player messaging or generative AI.**
Players choose preset topics; replies reflect the district, mentor, activity and
earned stamps. No chat is sent to a server or saved online. Public/free-text
multiplayer messaging, moderation, reporting, guardian approval and Firebase
chat storage are not implemented by this expansion.

The passport exists in memory only. It survives page/map navigation within the
app session and resets on refresh, sign-out, account change or a new practice.
It is deliberately separate from authoritative financial progress and Firebase.

## Source and assets

- `apps/client/village/districts.json`: map paths, spawn points and activity sites.
- `apps/client/village/content.ts`: mentors, dialogues, activities and validation.
- `apps/client/village/VillageExperience.tsx`: passport, travel, native modal chat.
- `apps/client/village/ActivityPanel.tsx`: five activity interaction types.
- `apps/client/village/session.ts`: isolated, ephemeral passport state.
- `apps/client/World.tsx`: existing movement extended with map navigation,
  bounds, markers and the original rigged Blender mascots.
- `tools/blender/build_districts.py`: reproducible source for both new maps.
- `assets/source/blender/yatai-{sakura,craft}.blend`: editable source scenes.
- `public/models/yatai-{sakura,craft}.glb`: runtime geometry, not image planes.
- Matching `.navigation.json` files: generated collisions and interactions.
- `public/models/village-expansion.json`: asset provenance and size metadata.

Regenerate only the expansion maps from the repo directory:

```
node tools/blender/headless.mjs tools/blender/build_districts.py
```

The script uses the installed official headless Blender Python module. It does
not depend on a running Blender MCP connection, and does not overwrite the
original village/board models or the original asset manifest.

## Validation

`tests/unit/village-expansion.test.ts` covers map provenance/size, collision-safe
spawns, reachability of every interaction using the player collision radius,
activity answer contracts, bento/budget checks and contextual NPC replies.
`tests/unit/village-session.test.ts` also covers duplicate stamps, profile/new
practice/sign-out resets, money-state isolation and server-rendered UI contracts.
Blender renders are under `docs/screenshots/blender/yatai-*.png`.

Verified locally: 21 expansion checks; 103 tests across the unit suite; TypeScript
and the complete client/server production build passed. Both exported maps were
also inspected through Blender-rendered previews.

Browser interaction testing and deployment are separate from these checks.
This expansion does not configure Firebase or publish a new hosted version.
