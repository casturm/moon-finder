# Moon Finder

A static browser app showing lunar phases and the Moon's direction from your current location.

Serve this directory with a static HTTP server (`python3 -m http.server 8000`) and open localhost. Deployed location and compass require HTTPS. SunCalc 1.9.0 and magnetic declination load from pinned CDNs; internet access is required.

The default Moon view uses a WebGL lunar surface renderer with local NASA LROC color and LOLA elevation maps. Surface brightness and terrain shadows follow the selected phase; the bright limb and approximate lunar axis follow the local horizon. If graphics or texture loading fails, the app shows a clear status message while phase information and time controls remain available. Precise libration, eclipses, and calibrated photometry are outside this model.

Date/time uses your browser timezone. Day steps and playback (one day per second) preserve local calendar time, subject to browser normalization at daylight-saving transitions. Supported input years are 1900–2100. Return to Now resumes live updates. Location stays fixed during exploration.

Show compass requests sensor access; Hide stops monitoring. The compass is heading-up: the top marker represents the top of your phone, while cardinal labels and the Moon bearing move relative to your heading. Use it with the phone flat in portrait. Landscape replaces the dial with a rotate-to-portrait message; returning requires a fresh heading. Guidance uses the selected time and current physical heading. Safari magnetic headings receive declination correction; earth-referenced absolute orientation uses true north. Real hardware verification remains necessary.

Add exactly `?debug=1` for developer diagnostics. This is not persisted or access control. No location/sensor telemetry service is added.

Pure helpers are exported from `moon-model.js`. [SunCalc 1.9.0 conventions](https://github.com/mourner/suncalc/blob/v1.9.0/README.md) use radians and south-based azimuth, unlike newer versions.

## Surface rendering

Open `/renderer-preview.html` on the same local/ngrok server to explore the natural renderer with example phase buttons, a date/time input, day steps and playback. Reference locations are explicit; Use my location is optional. The natural renderer is now used by the main app with the brighter, phase-dependent earthshine approved during visual review.

The renderer uses local NASA LROC color and LOLA elevation maps (about 2.2 MB total), actual-scale terrain normals and nearby terrain shadows, approximate lunar diffuse reflection, subtle phase-dependent earthshine, and an approximate lunar-axis orientation. It draws only when time/location/size changes, capped at 512 pixels; no continuous graphics loop or framework. Full libration, eclipses, photometric calibration and fine-scale crater shadows are not modeled. WebGL failure shows an explanation; the original photograph/mask renderer has been removed.

Credits and asset regeneration: [lunar data](images/LUNAR-DATA.md). Independent checks: `node tests/renderer.mjs`; report: [renderer test report](docs/renderer-test-report.md). Real-phone GPU and Safari checks remain pending.

## Compass field validation

In debug mode, **Test location** accepts observer coordinates as `latitude,longitude`. Apply reloads using a shareable URL such as `?debug=1&location=45.514615,-122.641564`; GPS is not requested or used to overwrite a valid override. Malformed overrides show an error until corrected or **Use my GPS location** is selected. Outside debug mode the parameter is ignored. The override also determines magnetic declination, so use your real GPS position for physical compass validation.

Open `https://casturm.github.io/moon-finder/?debug=1` after the validation branch is reviewed and deployed. Show compass, then scroll to Compass field checks. The tools use the production heading pipeline; no separate simulated compass is substituted.

- **Known true bearing:** enter a surveyed/map bearing, not an uncorrected magnetic compass reading.
- **Landmark coordinates:** enter a distant identifiable landmark's latitude/longitude from a map. An independent great-circle calculation gives its initial true bearing and distance from your GPS position. Nearby landmarks amplify coordinate uncertainty.
- **Sun:** an independent implementation of NOAA's fractional-year solar approximation shows true azimuth and geometric altitude at the selected time. Return to Now for a physical check. Use shadows instead of looking at the Sun. This approximate reference is unsuitable for precision calibration, especially near the zenith/horizon. Sun comparisons do not independently validate the Moon; a link to USNO Sun/Moon altitude/azimuth tables is included.
- Capture snapshots while aimed at the reference, then after a turn, tilt, or return from another app. Readings older than three seconds or not accepted by the compass pipeline are marked unusable. A turn-to-reference value becomes a heading discrepancy only when physically aimed at that reference.
- Snapshots include exact coordinates and notes, stay in the current tab, and can be downloaded as JSON. They are not uploaded by these tools. Download before closing; Clear removes in-tab snapshots.

Automated calculations: `node tests/validation.mjs` (requires the same pinned SunCalc fixture as existing tests). This checks known geometry, a published NREL solar example and a seasonal/hemisphere grid. It cannot certify phone sensor accuracy.
