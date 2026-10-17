# Moon Finder — first product iteration

Status: approved by the tech lead on October 16, 2026; implementation authorized. Code review and release remain separate gates.

## Agreed scope

The user has selected coordinated subagents, a Moon oriented to the local sky, date/time selection with day steps and playback, and an explicit developer URL switch for diagnostics. The tech lead reviews requirements first, then the code diff and independent testing evidence. No merge or release is authorized by this document.

## Moon appearance and location

- Render a circular Moon with the illuminated region produced by the projection of a spherical terminator. The limb and terminator share the same center and polar radius; the terminator is an ellipse except at quarter phase, when it is a straight diameter. Do not approximate the shadow by subtracting an offset circle.
- Illumination varies continuously through new, crescent, quarter, gibbous, and full phases. The selected instant determines phase name and illuminated percentage as well as geometry.
- Orient the bright limb relative to the observer's local vertical, using the selected instant and the user's latitude/longitude. The graphic is a horizon-relative sky view, rather than one that rotates with the physical device. Test both hemispheres and rising/setting situations.
- Keep the Moon disk, shading, and texture aligned. A dim dark side may remain visible for legibility, but must not be counted as illuminated area. Full physical texture rotation, libration, photometric realism, and eclipses are outside this iteration.
- Location remains the user's current geographic location during time travel. Phase can be calculated while location is pending/unavailable, but local orientation, altitude, bearing, and compass guidance must clearly state that location is needed; never display sample values as actual results.
- Show altitude with an above/below-horizon descriptor and bearing normalized to 0–359 degrees. A below-horizon Moon remains inspectable, with an explicit status rather than an implication that it can be seen.

Acceptance: synthetic fractions 0, 0.25, 0.5, 0.75, and 1 produce the corresponding projected illuminated area, within rendering tolerance; a quarter is a semicircle. Values immediately around quarter and full/new transitions show no geometry jumps or missing/overlapping masks. The Moon’s bright side tracks the projected Sun direction in independent location/time fixtures, including a Southern Hemisphere case. The near-new/full degenerate orientation does not produce invalid coordinates or flicker.

## Time travel

- Default to live Now and clearly display the represented date/time and timezone. Refresh the live instant at least once per minute while the page is active.
- Provide a labeled date/time input, Previous day, Next day, Play/Pause, and Return to Now. Date/time entry and day steps enter a visibly marked exploration mode.
- Approved default: interpret input in the device's local timezone; show that timezone next to the control. Day steps preserve local wall-clock time across daylight-saving changes. If a daylight-saving gap or ambiguity is normalized by the platform, reflect the effective date/time back to the user.
- Approved playback default: advance one calendar day per second. Play continues from the selected instant; Pause leaves that instant selected. Manual input or stepping pauses playback. Return to Now stops playback and resumes live updates.
- Recompute phase, illumination, shading orientation, altitude, direction, azimuth, and the active compass target from one shared selected instant. Never combine today's bearing with a future phase.
- While exploring, describe compass guidance as the direction for the selected date/time. The physical device heading is current; it does not time travel.
- Reject empty or invalid dates with an accessible message while preserving the last valid display. Approved supported input range: calendar years 1900–2100; pause playback at either bound and explain why. This is an input bound, not an assertion of ephemeris accuracy throughout that range.

Acceptance: input, day steps, playback, pause, and Now all keep every displayed value synchronized. Repeated play clicks cannot create multiple playback timers. Playback pauses when the document is hidden and does not jump ahead when restored. Day stepping is verified across a local daylight-saving boundary. Return to Now uses the actual current instant rather than the page-load instant.

## Compass

- Keep one persistent control: Show compass when hidden, Hide compass when visible. Start hidden. Hiding preserves the app's date/time and location.
- Show triggers any required permission request directly from the user's gesture. Hiding ends orientation monitoring; showing again must not duplicate listeners or require a reload.
- Model visible states explicitly: awaiting permission, awaiting heading, active, denied, unsupported/unavailable, and error. Never render NaN or pretend the user is aligned without a valid heading.
- On denial or unavailable sensors, show a concise explanation; manual bearing and altitude remain useful. Retrying is available when appropriate. If no usable reading arrives after the approved five-second timeout, show the unavailable state rather than waiting indefinitely.
- Use valid available heading sources with a defined true/magnetic north convention and correction. Validate heading values, normalize wraparound, and choose the shortest left/right turn. Preserve the existing five-degree alignment tolerance.
- Expose compass visibility through an accessible button state; permission/status changes should be announced without repeatedly announcing every sensor update.

Acceptance: show/hide, denial, unsupported APIs, no readings, invalid readings, permission exceptions, retry, and successful headings are exercised. Across 359°/1° the instruction is the short turn. Repeated time travel and compass toggles leave at most one sensor listener, and hiding leaves none. Active guidance updates to a changed selected instant.

## Developer diagnostics

- Approved exact opt-in: `?debug=1`. Missing, empty, or other values leave diagnostics disabled. The setting is per URL and is not persisted.
- Ordinary users see no debug panel, developer controls, or routine diagnostic console output. User-facing error/status messages remain available.
- When opted in, expose useful selected instant, coordinates, phase/fraction, local orientation, target bearing, sensor source/heading, correction, and compass state. Diagnostics are developer convenience, not authentication or access control.

Acceptance: compare the same scenario with no parameter, `debug=0`, and `debug=1`; only the last exposes diagnostics. Location and sensor data are not sent to a new service by this work.

## Usability and delivery

- Preserve the existing visual direction while fitting controls on narrow mobile screens and desktop. Inputs and buttons have visible labels, focus indicators, keyboard operation, adequate contrast, and touch-friendly targets. Loading/error states replace hardcoded placeholder astronomy.
- Keep this iteration a static browser app. Packaging, hosting, monetization, account systems, offline installation, and a new design system are out of scope.
- Independent testing must report the tested revision, checks and fixtures, results, screenshots of representative phases, sensor mocks versus real-device coverage, and limitations. Browser mocks do not establish real compass accuracy; flag the real-device check clearly.

## Approved defaults

1. Device-local timezone, one day per second playback, calendar-day stepping, and years 1900–2100.
2. Horizon-relative Moon orientation independent of phone rotation; texture libration excluded.
3. Compass initially hidden, five-second no-heading timeout, and five-degree alignment tolerance.
4. Exact debug switch `?debug=1`, with no persistence.

The tech lead approved this scope and these defaults. Changes to consequential behavior should be surfaced for review; implementation may proceed.
