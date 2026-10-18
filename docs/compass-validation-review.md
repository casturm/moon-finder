# Compass field validation review

## Proposed scope

Extend `?debug=1` with real sensor diagnostics, independent landmark and approximate Sun references, manual true-bearing input, and downloadable observation snapshots. Keep existing Moon guidance and sensor conversion unchanged. Use existing date/time controls. Main remains production; implementation is on `codex/compass-validation`.

## Code review

- Pure reference functions have no SunCalc or sensor dependency. Landmark bearings handle the dateline and reject coincident/antipodal points and invalid coordinates.
- NOAA solar reference uses UTC consistently, leap-year length and east-positive longitude. The approximate position is geometric; it is explicitly not a precise lunar or solar ephemeris.
- Raw readings are captured before conversion; accepted readings are marked separately. Field checks use the existing true heading and declination rather than a second heading algorithm. Samples require active portrait guidance and a reading under three seconds old.
- No remote telemetry or persistent storage added. Snapshot downloads include coordinates and warn about that fact.
- UI loads only under the existing exact debug query. Reference errors produce explicit messages; blank coordinates are not interpreted as zero.

## Validation

- Existing five grouped model/time/astronomy checks pass with `TZ=America/Los_Angeles node tests/run.mjs`.
- Landmark tests pass for four cardinal directions, distance, dateline crossing, invalid and undefined bearings, and 359°/1° turn wrapping.
- NOAA approximation matches the published NREL SPA example within 0.5° in azimuth and altitude.
- 160 SunCalc comparisons across two years (including leap year), five seasons/months, four UTC hours and four locations in both hemispheres pass with sky angular separation under 1°. Maximum altitude difference 0.345°; maximum azimuth difference away from zenith/nadir (absolute altitude below 75°) 0.692°. Near zenith/nadir azimuth is ill-conditioned; UI recommends a landmark.
- DOM interaction checks pass using jsdom: reference switching, empty inputs, north wraparound, stale readings, snapshot export contents, clear, and missing location. This does not exercise browser rendering or real sensors.
- JavaScript syntax and whitespace checks pass.
- Browser rendering and physical iPhone sensor validation remain pending. Browser install in this environment failed because the downloaded browser archive was truncated; do not infer browser/phone approval from calculation tests.

## Approval status

### Observer-location follow-up

`?debug=1&location=45.514615,-122.641564` now sets the observer location, skips GPS, and recalculates declination. A Test location form at the start of debug mode provides a visible override and a GPS return link. Invalid URL values produce an explicit error; non-debug URLs ignore this parameter. Applying the form reloads the page, so an outstanding GPS callback cannot replace the new override.

`tests/debug-location.mjs` passes coordinate/URL/form checks and actual app startup checks in jsdom, including GPS suppression, malformed override handling, GPS fallback and ignoring the parameter outside debug. Existing validation DOM checks, JavaScript syntax and whitespace checks also pass. Physical browser/phone checks remain pending.

The comparison link for review commit `6ec4c5a` was supplied to the user. On October 18, 2026 the user explicitly answered yes to merging and publishing these changes. This authorizes integration and deployment; it does not claim separate test-report approval or completion of real-phone validation.

## Delivery status

An initial upload returned 403 and CLI push lacked credentials. Installing the ChatGPT Codex Connector for casturm resolved integration access. The implementation was then uploaded as `6ec4c5a` on `codex/compass-validation`. User-authorized integration and deployment are in progress; remote refs and the live Pages files establish final delivery status.
