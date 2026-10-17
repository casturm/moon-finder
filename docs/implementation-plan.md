# Moon Finder implementation proposal

Status: plan, test report, and code changes approved. Implementation remains on codex/moon-product-review. No PR or branch protection setup requested. See test-report.md for verification coverage.

## Current behavior and defects

- Static HTML/CSS/browser JavaScript; no build system, package manifest, or existing tests. SunCalc is pinned to 1.9.0 and magvar to 2.2.0 through CDNs.
- The current shading uses half rectangles and ellipses. Its SVG clip is centered at (153,153), radius 137, while terminator geometry uses (150,150), radius 150. Translucent overlapping shapes also produce darker seams.
- Phase rotation only flips waxing/waning; bright-limb angle and observer parallactic angle are unused.
- Every call to `updateMoon` adds another click and orientation listener, capturing an obsolete target azimuth. Time travel would expose this immediately.
- Debug is hardcoded on; routine coordinates/date are logged. The compass button disappears after permission, and only Safari heading input is handled.
- Location failure only logs an error; the UI retains fabricated initial values. Time controls must not make those look calculated.

## Minimal architecture

Keep the static application. One implementation agent owns `app.js`, `index.html`, `style.css`, and any new small pure geometry/state module. Avoid an unrelated framework, build system, dependency upgrade, or asset redesign.

Separate pure calculation from event lifecycle and rendering:

1. State: observer coordinates, selected instant, live/selected/playback mode, compass visibility/permission/heading, debug flag.
2. Calculation: one `calculateMoon(date, latitude, longitude)` result containing phase, fraction, azimuth, altitude, bright-limb orientation.
3. Rendering: consume that result for all labels, shading, and the current compass target.
4. Initialization: register control handlers once. A compass controller attaches at most one sensor listener and removes it on hide. Recalculation never registers listeners.

## Spherical terminator and local sky orientation

Retain SunCalc 1.9.0 conventions: angles are radians and azimuth is south-to-west; normalize converted compass azimuth into [0,360). **Do not use the latest SunCalc README as the version contract:** its units have changed.

Use one disc coordinate system for the texture and mask, after inspecting the PNG's actual visible disc bounds. Clip the texture to that disc and preserve aspect ratio so the existing non-square PNG does not deform the Moon.

A canonical mask has its bright side toward screen right. At normalized vertical coordinate y, the limb is x = sqrt(1-y²); the terminator is x = (1-2f) sqrt(1-y²), where f is illuminated fraction. The lit region lies between this terminator and the right limb. This gives exactly fraction f of the projected disc, a straight terminator at quarter phase, and continuous crescent/gibbous geometry. Build a single SVG path/mask from analytic elliptical arcs or sampled points; avoid stacked translucent shapes. Render a dim textured disc beneath the fully lit masked texture, so shadow opacity is consistent.

SunCalc documents observer bright-limb zenith angle as `illumination.angle - position.parallacticAngle`, anticlockwise from zenith. In screen coordinates (right positive x, down positive y), the bright direction is `(-sin(theta), -cos(theta))`; rotate the canonical right-lit mask by `-90° - theta * 180/PI`. Validate this sign against independent orientation fixtures, including both hemispheres and a low-altitude crescent. Keep text upright. At almost new/full Moon the direction is visually ill-conditioned but the disc geometry remains stable.

Texture rotation/libration is a separate fidelity concern: align the shadow to the local sky in this round; do not claim precision lunar surface orientation without an additional lunar-axis/libration model.

## Time travel

- Start in live Now mode. Use the same selected instant everywhere, including compass target and sky orientation.
- Date/time input uses browser local time and labels that timezone explicitly. Store an absolute `Date`; validate invalid or out-of-supported-range values before recalculation.
- Day stepping and playback use local calendar days, preserving wall-clock time through daylight-saving changes. Playback advances one calendar day per second and shows Pause while active. Reflect platform normalization of daylight-saving gaps or ambiguities back into the input.
- Editing/stepping leaves live mode; Now stops playback and resumes current-time updates. Pause preserves the selected instant. Stop the old timer before creating another; pause playback while hidden and clean up on unload.
- Keep location fixed during travel. For this round, “local time” means the browser timezone, not inferred timezone at the coordinates.
- Proposed input bounds are calendar years 1900–2100; pause at bounds with a visible explanation. Manual entry or stepping pauses playback; empty or invalid input preserves the last valid calculation with an accessible error.
- Phase remains available without location; replace location-dependent orientation, altitude, bearing, and guidance with a location-needed state.

## Compass and developer access

- Persistent Show compass / Hide compass button; sensor permission request occurs only within the Show click gesture. Hidden means no sensor listener and no finder output.
- Explicit pending, denied, unavailable, and waiting-for-heading messages; no NaN bearings. Feature-detect `DeviceOrientationEvent` before accessing it. Prefer Safari's `webkitCompassHeading`; accept standard absolute orientation only when it provides a meaningful earth reference. An unsupported device can still read the calculated azimuth.
- Start hidden; expose button state accessibly. After five seconds without a usable heading, expose unavailable status with a retry action. Preserve the existing five-degree alignment tolerance.
- Compute magnetic declination once per location, not every sensor event. Keep physical sensor heading at present-day calibration while the Moon target follows the simulated instant.
- Debug opt-in proposal: exactly `?debug=1`; default UI and console omit diagnostics and location logs. Debug panel may display selected date, coordinates, raw angles, heading source, and permission state. Treat URL opt-in as developer convenience, not authentication.

## Ownership, dependencies, and review

- Requirements agent owns requirements documents and acceptance criteria.
- Implementation agent owns product files and this plan. It waits for requirements approval before product edits.
- Testing agent owns tests and verification reports; it may prepare fixtures now, then verify the implementation revision independently.
- Coordinator owns work board and review package. No merges/releases before user review.
- Test-facing boundary: export pure disc geometry, angle conversion, selected-time transitions, and shortest-heading-difference functions where useful. Agree interfaces before independent tests depend on them; tests must derive expected behavior from approved criteria rather than repeat implementation formulas.

Key risks: shading/texture bounds, rotation sign, browser-specific sensor permission/reference frames, selected-date timezone ambiguity, and CDN availability. Physical compass accuracy requires a real mobile-device check; desktop simulation can establish lifecycle and arithmetic only. Browser permission/error states and location failure should be included in the initial verification, since they otherwise leave misleading data visible.

Primary source: [SunCalc 1.9.0 README](https://github.com/mourner/suncalc/blob/v1.9.0/README.md), particularly Moon position, Moon illumination, and the documented observer zenith-angle relationship. The spherical projection equation above is an implementation derivation; it is not a SunCalc API feature.
