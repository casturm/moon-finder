# Compass reliability follow-up

Branch: `codex/compass-recovery`. No approval or production delivery is recorded for this follow-up.

Reported symptom: iPhone heading disagreed by 40–50° with Apple Compass, then Moon alignment shifted after switching apps.

Confirmed code gaps: Safari compass accuracy was ignored, and visibility changes preserved the previous heading. These are plausible contributors, not proof of the physical cause. Magnetic interference, calibration, phone tilt, and the native Compass true-north setting still require device verification.

Changes:
- Reject reported negative accuracy (uncalibrated) and uncertainty greater than 15°. Hide guidance and show calibration advice, keeping the listener available for recovery.
- Include reported uncertainty in the existing 5° alignment allowance. Missing accuracy preserves existing behavior; it is not a measured accuracy guarantee.
- Clear headings on background/foreground transitions, ignore background readings, and start a fresh five-second wait upon return. Background time does not consume that wait.
- Preserve the existing magnetic-to-true-north correction.

API reference: https://developer.apple.com/documentation/webkitjs/deviceorientationevent/1804769-webkitcompassaccuracy — accuracy is in degrees; -1 means uncalibrated and unusable. The 15° guidance cutoff is an application policy.

Verification: model suite passed all five groups; syntax and whitespace checks passed. UI suite passed all 11 groups, including the new C7 regression. New C7 regression covers uncalibrated and 40°/50° uncertainty, recovery, background reading rejection, background timeout suspension, fresh foreground readings, listener count, and withholding alignment for 10° uncertainty. Initial C7 mock dispatched only the ordinary event while Chrome selected the absolute event; corrected the mock to dispatch both, matching the existing test helper.

Physical iPhone verification: NOT RUN. Test with the phone flat in portrait, away from magnetic accessories/metal, native Compass set to true north, and live Now selected. Compare headings before and after switching apps. Do not treat browser mocks as proof that the reported physical offset is fixed.

## User guidance follow-up

Added visible warning copy below compass guidance (including while waiting for a reading): alignment is approximate, sensor drift can occur even when alignment is shown, keep the phone flat and away from magnets/metal, and gentle rotation may help calibration without guaranteeing accuracy. This follows user observations of intermittent drift and improvement after rotating the phone; those observations were on the existing app and do not validate the review-branch changes. Text-only addition checked with `git diff --check`; the browser results above precede it. Copy and code remain unapproved for integration or deployment.

## Reconciliation with remote main

User authorized reconciliation and pushing main after the initial push rejection. Merged remote main `81ab89f`, preserving compass validation diagnostics and Moon Journal functionality. Resolved app conflicts by retaining both sensor diagnostic capture/reset and heading accuracy/background handling. Combined diff was inspected against remote main; no journal implementation changes were introduced by conflict resolution.

Combined verification: all 11 browser UI groups, five model groups, three bearing-validation groups (including 160 solar comparisons), and 44 Moon Journal unit tests passed. Syntax and whitespace checks passed. `tests/debug-location.mjs` could not run because `jsdom` is missing; `tests/validation-ui.mjs` requires the same missing module and was not run. Physical iPhone verification remains unperformed. No separate test-report approval is inferred from authorization to integrate/push.
