# Learning reports

Reports are derived from existing game records. They do not introduce Google Analytics, advertising identifiers, public rankings, AI grading, or another database. No student data is bundled in the published site.

## Where to find them

- Student: **Learning report** in navigation, or **View learning report** while learning. The report remains accessible when play is paused.
- Parent: expand **View learning report & download** under a linked child. Uses the existing protected, live `/views` subscription.
- Admin: **Learning analytics**, a name-filtered cohort summary, and a student report selector. Uses the existing protected `/views` collection, with realtime snapshots so changes appear while pupils learn. A trusted admin claim is required; the Firestore rules independently enforce it. Read failures clear displayed records. The existing `adminList` endpoint also supports derived reports for callers after its next function deployment. Missing report data is unavailable, never zero.
- Money Quest: **Learning report** near the top of the mission, during lessons and play. This is browser-local practice, not a verified child's record.
- Village: open the session-only passport from the student's report page. Unique stamps do not count twice for revisiting an activity in another district.

Each report offers a standalone HTML download, a CSV export, and a print dialog for saving PDF. Generated snapshots include learner/scope, generation time, metric definitions, next-step suggestions, detailed evidence and limitations. Exported copies are outside application access controls.

## Definitions

| Measure | Numerator / denominator | Interpretation |
| --- | --- | --- |
| Finance completion | completed lessons / 6; completed gate checks / 3 | Progress, not long-term mastery |
| Answer accuracy | recorded correct finance answers / all recorded finance attempts | Includes retries; unavailable with no attempts |
| First-try understanding | correct first answers / distinct finance checks attempted | First chronological answer for each kind/index |
| Hero Lab completion | reflected units / 12 | A unit contains lesson, artifact and reflection; reflection option zero is valid |
| Daily activity | recorded finance answers grouped by UTC date | Not time spent; topics and denominators differ across days |
| Board application | ledger encounters in named categories | Exposure and applied choices, never a quality or wealth score |
| Money Quest completion | distinct lesson-completed quarters / configured mission quarters | Does not depend on collecting the coin deposit |
| Money Quest understanding | correct lesson-response events / recorded lesson-response events | Completing the sequence after feedback does not imply correct answers |
| Cohort accuracy | sum(correct) / sum(attempts) | Attempt-weighted, not the mean of individual percentages |

## Data coverage and privacy

- Invalid, unknown-topic, future-dated or undated finance answer entries are excluded from answer metrics. A completed legacy lesson with no history remains unmeasured.
- Hero Lab saves have no historical answer accuracy or completion dates. The report does not invent them or grade personal reflections, confidence, personality, or ability.
- The current game is not a historical archive of deleted/restarted games. Download before replacing a local Money Quest save.
- Village activity stamps are session-only; no durations or attempt accuracy are recorded.
- Money Quest events have sequence numbers, not per-event timestamps. Its report includes quarterly lessons, corrective feedback, decision reasons, reflections and support use. Local data is never silently attached to a child account.
- Account report access retains the existing Firebase rules (self, linked parent or trusted admin claim). Economy/record writes remain server-only. The reporting addition introduces no new collection or security-rule changes.
- Admin results include at most 200 accounts. The loaded subset and name filter are disclosed in the screen and export; parents/admins are excluded from cohort metrics. No total-school claims or rankings.
- HTML values are escaped; CSV cells guard spreadsheet formulas. Reports exclude Firebase UIDs, parent link codes, receipts and private game decks.

## Deployment

All report screens work with the existing learner views and permissions; no migration is needed. Standard realtime listeners are retained because live updates during learning are required. The optional enhanced `adminList` callable response requires publishing the updated `leadAction` function separately. A Sites static deployment does not deploy Firebase Functions; the admin report screen does not depend on that response. Live account/permission verification still requires an authorized Firebase session.

## Verification

`tests/unit/learning-report.test.ts` covers empty/legacy records, retries, receipt replay, UTC activity, cohort denominators, local mission evidence and safe exports. `tests/unit/learning-report-access.test.ts` checks the administrator claim boundary using mocked Firebase services, not a live permissions certification. Browser tests cover the actual report UI, downloads, mobile overflow and filtered synthetic admin records. Live Firebase account checks require an authorized project session.
