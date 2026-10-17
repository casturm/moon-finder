# Moon Finder independent acceptance test plan

Status: proposed; requirements approval is required before implementation or runnable-test authoring.

Baseline inspected: `2eb60f2cc1895a3478f332cfaa2cfa69ad98fd8b`, application source only. No browser or physical-device execution has occurred. This document is owned by the testing agent; application files are owned by implementation.

## Verified baseline findings (static inspection)

- The moon clip uses center (153,153), radius 137; terminator ellipses use center (150,150), radius 150. Geometry does not share a disk.
- The rendering uses ellipses and half-disk rectangles. It is not merely a subtracted circular cutout. Actual visual severity still needs screenshots.
- `illumination.angle` and `position.parallacticAngle` do not affect rendering. Only a horizontal waxing/waning reflection is applied, so local-sky tilt is absent.
- `DEBUG` is hardcoded true; date, coordinates and position are logged regardless of it.
- Every `updateMoon` invocation adds click and orientation listeners. Time travel would multiply subscriptions without a lifecycle change.
- The compass enable button hides after permission succeeds. There is no Show/Hide feature. Orientation is subscribed before permission or user activation.
- Heading assumes `webkitCompassHeading`; unsupported-event values can propagate NaN. A missing global `DeviceOrientationEvent` is not guarded.
- Geolocation failure only logs an error. Initial HTML contains plausible phase/position placeholders that can remain visible after failure.
- There are no time controls, test scripts or package manifest in the baseline.

Suspected, not runtime verified: overlapping translucent crescent shapes can double-darken their overlap; portrait/landscape changes may need heading convention handling; CDN failures may prevent initialization. Test these before claiming observed defects.

## Test authority and independence

Use the approved requirements as acceptance authority. Verify actual pixels and state transitions, not just helper outputs. A test that calls the production geometry function to calculate its own expected result is not an independent oracle. Record dependency versions. The app currently pins SunCalc 1.9.0: its angles are radians and azimuth starts at south. Current upstream v2 conventions differ.

Sources:

- [SunCalc 1.9.0 reference](https://github.com/mourner/suncalc/blob/v1.9.0/README.md): version-specific angle and azimuth conventions; observer tilt derives from illumination angle minus parallactic angle. This validates integration conventions, not independent numerical astronomy accuracy.
- [US Naval Observatory 2026 primary phases](https://aa.usno.navy.mil/calculated/moon/phases?year=2026): independent dated phase fixtures below. Retrieved October 16, 2026, local date.

## Geometry and sky orientation

G1. Render synthetic illumination fractions 0, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99 and 1. At quarter illumination the terminator is a straight diameter; near full/new it approaches the rim continuously. No rectangular edges, seams, doubled opacity, negative radii or shadow spill outside the circular limb.

G2. Independently rasterize a unit sphere: at projected coordinate (x,y), z = sqrt(1-x²-y²). For fraction f and bright direction theta (clockwise from screen up), use light vector (sqrt(1-c²) sin(theta), -sqrt(1-c²) cos(theta), c), c = 2f-1. A pixel is geometrically lit when its surface normal dot light vector is positive. Compare the production silhouette with this separately implemented oracle, excluding a 1-pixel antialias boundary. Proposed tolerance: lit disk area within 1 percentage point at radius >= 150 pixels, with no systematic misplaced boundary beyond 2 pixels. Compare lit geometry, not image brightness, because texture and earthshine change brightness.

G3. Rotate synthetic cases through 0, 90, 180, 270 and 37 degrees. Confirm bright-side direction using known screen coordinates so sign errors and hidden extra quarter-turns fail. Fraction and disk area must be invariant under rotation.

G4. At the same UTC instant compare Portland (45.5152,-122.6784), Sydney (-33.8688,151.2093) and Quito (-0.1807,-78.4678). Global phase/fraction stays the same within display rounding; local altitude, direction and tilt vary. Independently project Sun and Moon local horizontal unit vectors onto the observer's sky tangent plane to check bright-limb direction, rather than copying the production angle subtraction. Use a 2-degree orientation tolerance away from new/full and zenith degeneracies; those degenerate cases must remain finite and visually stable.

G5. Check disk-mask alignment against the actual image at 320px mobile width, large desktop, browser zoom 200%, portrait and landscape. Inspect all eight common phases. Clarify that local-sky phase orientation does not promise precise crater libration or photorealistic surface illumination.

## Independent dated astronomy fixtures

USNO UTC primary phases: new 2026-10-10 15:50; first quarter 2026-10-18 16:12; full 2026-10-26 04:12; last quarter 2026-11-01 20:28. Use explicit UTC strings and fixed coordinates. Proposed numerical tolerances for the existing approximate ephemeris: fraction <= 0.01 at new, >= 0.99 at full, and 0.50 +/- 0.02 at quarters; phase cycle coordinate within 0.02 of 0, 0.25, 0.5, 0.75 respectively (circular difference). Exact 0/1 is not required. Dates alone cannot establish tilt correctness. Add one intervening waxing and waning date for correct lit-side direction and continuous evolution. Store source, UTC instant, coordinates, expected range and observed value with each fixture.

## Time travel

T1. Initial Now uses current clock; selected date/time, phase, illumination, altitude, azimuth and compass target all represent one consistent instant. Freeze the clock for reproducibility. Location remains the same while traveling.

T2. A valid date/time edit and previous/next day each update all outputs together. Confirm whether approved day stepping means local calendar days; test Los Angeles 2026-03-08 and 2026-11-01 DST transitions, month/year rollover and leap day 2028-02-29. Test ambiguous/nonexistent local times against the agreed policy; timezone must be understandable in UI.

T3. Blank/invalid/out-of-range input must not produce NaN, an invalid SVG, stale values presented as fresh or an exception. Preserve the last valid selection with an accessible explanation.

T4. Play advances the selected time at its stated rate; Pause freezes it. Repeated Play does not create competing timers. Manual edits/day steps follow the approved pause behavior. Now stops playback and returns to the actual current instant. Test background/foreground and repeated control use. Inspect subscription/timer counts or observed callbacks after 100 updates.

T5. Future/past mode is evident, including the compass using that simulated target. Below-horizon status updates correctly across a crossing. Test keyboard interaction, labels, focus visibility and live announcements without noisy repeated speech during playback.

## Compass and diagnostics

C1. Default hidden finder has an available Show compass control. First Show requests permission only when platform requires it and from the user gesture. Granted -> visible usable guidance -> Hide -> hidden -> Show again works. No duplicate sensor subscriptions after repeated toggles or date changes.

C2. Cover denied permission, rejected permission promise, missing API, null/undefined/NaN readings and no sensor events. Each has understandable status without bogus arrows or NaN. Other features remain usable. Hiding must stop or suppress guidance according to approved lifecycle behavior.

C3. Feed controlled headings around target: 0/360 wrap, +/-180, +/-5 tolerance and both turn directions. The selected simulated time updates the target without stale closures. Confirm magnetic/true north convention and declination input date where supported; don't apply declination twice to an already true-north source.

D1. Plain URL and invalid opt-in values expose no developer panel or sensor/coordinate debug logging. Exact approved URL switch enables useful diagnostics. Reload without switch hides them again. User-visible compass is independent of debug mode. Diagnostics are a convenience gate, not security.

## Platform and release evidence

Browser automation can verify geometry, mocked geolocation/orientation, denied APIs, controls and responsive layout. It cannot prove physical heading accuracy or native iOS permission behavior. Require a real iOS Safari secure-context check and an Android browser check, with device/browser versions, compass calibration context and portrait/landscape observations. Mark unperformed physical checks NOT RUN, never PASS by mocking. Desktop no-sensor behavior is an acceptance case.

Also test geolocation pending/denied/unavailable and dependency load failure; placeholders must not impersonate live calculations. Use a local HTTP server for desktop; physical sensors generally need HTTPS or another browser-approved secure origin.

## Revision-specific report format

- Implementation commit SHA; working-tree diff/hash if uncommitted; approved requirement revision; dependency versions.
- Environment: browser/device, viewport, timezone, permissions, mocked versus real sensors, input UTC instant and coordinates.
- One row per test: ID, expected, observed, PASS / FAIL / NOT RUN / BLOCKED, screenshot or command evidence.
- Failures: reproduction steps, user impact, severity, application owner, relevant file/line, retest revision.
- Screenshot set: eight phases plus local-sky location comparison, mobile controls, normal/debug URLs and sensor error state.
- Separate automated results from manual visual results and physical-device limitations. Any code change after verification invalidates the affected evidence until retested.

Exit gate: no unresolved accepted-scope failures; explicit visibility of NOT RUN checks; user receives the diff, preview and report before deciding whether to merge or release.
