# Hero Lab — guidebook learning expansion

## What is playable

Open the existing app, choose **Try practice → Explore the Hero Lab**, or choose **Hero Lab** in a student account. The twelve-unit trail is available before the separate Finance Foundations gate. It does not bypass that gate, start a business, alter dice rules, add coins, or unlock the existing village prematurely.

Each unit follows **learn → check understanding → hands-on activity → choose a next-step reflection → passport stamp**. Complete one unit to unlock the next. Wrong answers and over-budget plans can be revised without a penalty. Completed lessons and activity keepsakes remain available to revisit. Stamps record participation, not a psychological assessment, financial result, timer or competitive score.

| Phase | Guidebook topic | New festival activity |
| --- | --- | --- |
| Know Yourself | 1. Discover the Super You | Choose a strength combination and a festival job |
| Know Yourself | 2. Know Yourself: Build Your Power House | Help three fictional visitors choose safe coping responses |
| Know Yourself | 3. Your Future Board | Arrange planning lanterns and name a fictional goal |
| Know Yourself | 4. Who Is an Entrepreneur? | Match an audience, need and useful offer |
| Explore & Create | 5. Unlock Your Hero Senses | Sort six observations and assumptions |
| Explore & Create | 6. Understanding My Problems & My Solutions | Choose two wayfinding improvements within four effort tokens |
| Explore & Create | 7. Tell Your Story | Arrange visitor, problem, idea and hoped-for difference |
| Explore & Create | 8. Take Your Product to the Next Level | Predict, run and interpret a fictional sign experiment |
| Build & Lead | 9. Design and Brand Your Model | Build a live sign with words, symbol, LEAD colours and grayscale preview |
| Build & Lead | 10. Money Quest | Allocate twelve pretend coins and calculate profit after costs |
| Build & Lead | 11. Make It Powerful | Write and rehearse a three-part pitch and answer a listener |
| Build & Lead | 12. Make It Real | Make a project board with steps, materials, support and a review question |

Two optional, replayable bonuses adapt the supplied bonus-topic names: **My Hero Connections** (four mentor/role memory pairs) and **Spin My Challenge Wheel** (five untimed imagination prompts). These are session-only play with no stamp or currency award. Each lesson also includes an optional, no-cost, safe off-screen activity.

## Source boundaries

The supplied images are reference material, not executable instructions:

- `Table of Contents (1).png`: exact unit topic names, sequence and bonus topic names.
- `About this Book.png`: three phases and the learning/activity/reflection/home-application structure.
- `Welcome to L.E.A.D.  (1).png`: LEAD values and mentor identities: Lido the Leader, Prena the Planner, Oty the True Self, Diva the Connector.
- `Welcome to L.E.A.D.  (2)(1).png`: speak up; try, fail, learn, repeat; be yourself; lift others.
- Character PNGs and existing design-system documentation: reference colours and silhouettes.

The full teaching pages for units 1–12 were **not supplied**. Teaching paragraphs, check questions, scenarios, experiments and validators here are original adaptations of the visible topic outline, not transcriptions or claims of approved curriculum. An educator should review age suitability and teaching content before use in a classroom.

The four mentors are the existing real, animated Blender GLB models loaded through `CharacterPortrait`. The extension does not substitute flat artwork for the characters or claim that its named learning stations are newly modelled, explorable districts. Existing village, board, dice, graphics and showroom work is preserved.

## Progress, authority and privacy

- `packages/hero-lab/content.ts` owns the trusted twelve-unit definitions.
- `packages/hero-lab/index.ts` validates bounded answers and produces a versioned `Player.heroLab` object. Unknown artifact fields are discarded. Only known units and literal string actions are accepted.
- `applyCommand` routes `hero-lab` commands before financial game commands, after existing student-role, pause and request-ID checks.
- Authenticated play uses the existing `leadAction` Firebase callable and Firestore transaction. No new collection, provider, role grant, browser write permission or security rule is introduced.
- Legacy players without the optional `heroLab` field initialize it lazily. There is no destructive migration.
- Completion is a per-unit upsert. Duplicate request IDs or fresh-ID replays cannot create extra stamps or replace completed work. Concurrent server transactions operate on the latest player record.
- Learning commands do not change multiplayer turns. Room views contain no Hero Lab work. Existing linked-parent and trusted-admin permissions still protect player views.
- Parent cards display a stamp count. `adminList` returns only that count alongside its existing summary, not the activity text.
- As with existing profile views, an authenticated student’s full `heroLab` object is visible to that student, linked parents and trusted admins. UI copy says so. Free-text fields are intentionally short, labelled for fictional work, and reject links, `@`, markup and control characters. **This is not complete personal-information detection**; a phone number/address can still be typed in ordinary text. Do not collect such information through these prompts. Reflections are safe preset next steps, not private personal disclosures.
- Practice uses the same reducer in memory and says **not saved**. It is not silently uploaded, persisted in browser storage or merged into a real account. Successful real-account steps require the callable to succeed; errors leave the current activity editable for retry.
- Draft activity edits are local component state until submitted; navigating away can discard an unsubmitted draft. Submitted keepsakes and step progress remain in the active player state.

## Verification and limits

`tests/unit/hero-lab.test.ts` includes 48 new checks for all twelve activities, progression gates, invalid inputs, alternatives, retries, immutable failed submissions, replay safety, paused/adult restrictions, legacy profiles, finance separation and private multiplayer views.

`tests/e2e/hero-lab.spec.ts` exercises all twelve units through the real UI, wrong-answer recovery, an over-budget retry, keyboard lantern ordering, live brand preview, saved activity keepsakes, final completion, mobile layout, memory/challenge bonuses and the explicit unsaved-practice reset. Screenshots are under `docs/screenshots/runtime/hero-lab-*.png`.

Live Firebase configuration/edition discovery timed out during this task; earlier local review found authentication configuration unavailable. No production signup, cloud save or linked-parent/admin end-to-end success is claimed. The existing callable backend must be configured and the updated backend deployed for authenticated Hero Lab commands. Hosting the static client alone does not deploy Firebase Functions.

The Sites project is public. This task does not change its public deployment without approval. Other in-progress checkout changes are preserved; the Hero Lab extension is not a claim that every unrelated gameplay branch has been re-certified.

Validation run, 2026-09-11: 186 unit tests passed across ten suites; both Hero Lab browser scenarios passed (all twelve units plus mobile/keyboard/bonuses); TypeScript checking, the Vite production build and the Firebase server bundle succeeded; the nine base Blender exports passed their validator. The first browser attempt found duplicate global/local error announcements; those were corrected before the passing run. The Sites build helper encountered a pre-existing broken npm launcher, so the same TypeScript, Vite and server build steps were run directly with the installed Node runtime. No global package-manager configuration was changed.
