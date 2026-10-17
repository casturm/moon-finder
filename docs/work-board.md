# Moon Finder work board

Baseline: `2eb60f2` — Add compass-guided moon finder.

## Agreed direction

- Coordinate three specialist subagents in the main chat.
- Orient the Moon to the observer's local sky.
- Time travel: date/time selection, day steps, playback, Return to Now.
- Diagnostics: explicit developer URL opt-in, off by default.

## Review gates

1. Tech lead approved requirements, technical approach, and test plan on October 16, 2026.
2. Independent testing verifies a specific implementation revision.
3. Tech lead reviews code diff, preview, and testing evidence before merge or release.

## Tasks

| Task | Owner | Status | Dependency / next action |
| --- | --- | --- | --- |
| Requirements and acceptance criteria | Requirements agent | Done — approved | Tech lead approved docs/requirements.md |
| Technical discovery | Implementation agent | Done — approved | Tech lead approved docs/implementation-plan.md |
| Baseline and independent test plan | Testing agent | Done — approved | Tech lead approved docs/test-plan.md |
| Discovery review package | Coordinator | Done — approved | Approval received; implementation gate cleared |
| Application implementation | Implementation agent | Done — code approved | Tested snapshot preserved on codex/moon-product-review |
| Implementation verification | Verification agent | Done — automated checks passed | See docs/test-report.md for exact coverage and pending manual checks |
| Acceptance review | Requirements reviewer | Done | Static findings fixed and verified; see docs/requirements-review.md |
| Prepare final code review | Coordinator | Done | Testing report and preview delivered |
| Test report approval | Tech lead | Done — approved | User approved testing report only |
| Code diff review | Tech lead | Done — approved | User explicitly approved code changes |
| Git integration | Coordinator | Not requested | Keep workflow simple; no PR or branch protection setup |

## Ownership

Implementation and tests share the managed worktree with exclusive file ownership: implementation owns product files; testing owns tests and test tooling. Original checkout retains approved requirements and reports. Code changes approved; no additional Git operation or deployment requested.

## Coordination note

Requirements, test report, and code changes are approved. The user prefers a simple workflow for this solo project: no PR setup or branch protection at this stage. Changes remain uncommitted on `codex/moon-product-review`; `main` remains at `2eb60f2`. No additional Git operation or deployment requested. Real-device and other manual checks remain NOT RUN as documented in test-report.md.

## Mobile layout follow-up

User reported iPhone date control overflow and missing background trees. CSS fixes are implemented on the review branch and passed focused phone/desktop layout checks. User approved this follow-up diff. Native iPhone confirmation remains pending. No merge, push, or deployment performed.

## Concentric compass follow-up

User approved the proposed interaction: fixed north-up Moon and phone rings; crescent and triangle markers; rings unite and turn green within five degrees; red phone ring otherwise; cardinal facing label replaces left/right turn degrees. Implementation complete on review branch. Eight browser UI check groups passed, including new compass-state checks; both states visually reviewed at phone width. User approved both compass styling and code changes. Functional browser checks passed; real-device accuracy remains unverified. No integration or deployment requested.

## Realistic Moon rendering follow-up

User authorized a separate visual comparison preview before replacing the primary renderer. Implemented `renderer-preview.html` and the WebGL surface renderer with locally hosted NASA color/elevation data. The main app still uses its approved SVG rendering. Independent testing: nine grouped checks passed; see `docs/renderer-test-report.md`. Coordinator reviewed crescent, quarter and full comparison screenshots. Real-phone rendering/performance, visual approval, and code approval remain pending. No merge, push or deployment performed.

Earthshine follow-up: user chose to keep the new renderer and authorized gently brighter dark-side detail. Preview adjusted; all nine renderer checks passed on rerun. Review the updated preview before switching the main app view.

## Natural renderer enabled in the app

User explicitly authorized updating the app to use the natural Moon renderer. The app now defaults to the WebGL surface view, with the adjusted earthshine and approximate local lunar-axis orientation. The existing SVG remains a loading/error/context-loss fallback. Time travel and location feed one shared calculation into both views; the compass is unchanged.

Independent verification complete: five new integration groups and eight existing UI groups passed. SVG fallback visibility defect found and fixed; updated mobile screenshot reviewed. Report: `docs/renderer-integration-report.md`. Real-phone/Safari checks remain pending. This supersedes earlier notes that the natural renderer is preview-only. Work remains uncommitted on `codex/moon-product-review`; no Git merge, push, or deployment performed.

## Old renderer removed

User explicitly requested removing the old rendering rather than retaining a fallback. Removed its SVG from the app and preview, the original Moon photograph, obsolete mask geometry helper, and its obsolete SVG-only test. The natural renderer is the sole Moon graphic. Loading, unavailable graphics and restoration have explicit status text; phase metadata, time controls and compass remain available. This supersedes prior fallback plans.

Independent verification: all 22 browser groups passed (5 integration, 9 renderer, 8 existing UI); five pure model/astronomy/time groups also passed. See `docs/renderer-integration-report.md`. Real-device checks remain pending. Changes remain uncommitted on the review branch; no merge/push/deployment performed.

## Portrait heading-up compass

User authorized replacing north-up compass behavior with heading-up guidance restricted to portrait. The phone triangle stays at the top; the Moon bearing and upright cardinal labels move relative to the current heading. Landscape shows a rotate-to-portrait message instead of guidance, ignores sensor readings, and pauses the heading timeout. Returning to portrait requires a fresh reading; Show/Hide retains its existing permission/listener lifecycle. Moon display and time controls remain available in landscape.

Implementation complete on review branch. All ten independent UI browser groups passed, including relative/cardinal heading, starting and rotating into landscape, paused timeout, fresh-reading return, and sensor cleanup. Coordinator visually reviewed the S-at-top screenshot. Report: docs/compass-heading-report.md. Real iPhone heading confirmation remains pending. No commit, merge, push or deployment performed.
