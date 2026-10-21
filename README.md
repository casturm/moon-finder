# Moon Finder

A static browser app showing lunar phases and the Moon's direction from your current location.

Serve this directory with a static HTTP server (`python3 -m http.server 8000`) and open localhost. Deployed location and compass require HTTPS. SunCalc 1.9.0 and magnetic declination load from pinned CDNs; internet access is required.

The default Moon view uses a WebGL lunar surface renderer with local NASA LROC color and LOLA elevation maps. Surface brightness and terrain shadows follow the selected phase; the bright limb and approximate lunar axis follow the local horizon. If graphics or texture loading fails, the app shows a clear status message while phase information and time controls remain available. Precise libration, eclipses, and calibrated photometry are outside this model.

Date/time uses your browser timezone. Day steps and playback (one day per second) preserve local calendar time, subject to browser normalization at daylight-saving transitions. Supported input years are 1900–2100. Return to Now resumes live updates. Location stays fixed during exploration.

Show compass requests sensor access; Hide stops monitoring. The compass is heading-up: the top marker represents the top of your phone, while cardinal labels and the Moon bearing move relative to your heading. Use it with the phone flat in portrait. Landscape replaces the dial with a rotate-to-portrait message; returning requires a fresh heading. Guidance uses the selected time and current physical heading. Safari magnetic headings receive declination correction; earth-referenced absolute orientation uses true north. Safari readings reported as uncalibrated or uncertain by more than 15° hide guidance and show calibration advice. Reported uncertainty also counts against the 5° alignment tolerance. Switching away clears guidance; returning requires a fresh reading. Real hardware verification remains necessary.

Add exactly `?debug=1` for developer diagnostics. This is not persisted or access control. No location/sensor telemetry service is added.

Pure helpers are exported from `moon-model.js`. [SunCalc 1.9.0 conventions](https://github.com/mourner/suncalc/blob/v1.9.0/README.md) use radians and south-based azimuth, unlike newer versions.

## Surface rendering

Open `/renderer-preview.html` on the same local/ngrok server to explore the natural renderer with example phase buttons, a date/time input, day steps and playback. Reference locations are explicit; Use my location is optional. The natural renderer is now used by the main app with the brighter, phase-dependent earthshine approved during visual review.

The renderer uses local NASA LROC color and LOLA elevation maps (about 2.2 MB total), actual-scale terrain normals and nearby terrain shadows, approximate lunar diffuse reflection, subtle phase-dependent earthshine, and an approximate lunar-axis orientation. It draws only when time/location/size changes, capped at 512 pixels; no continuous graphics loop or framework. Full libration, eclipses, photometric calibration and fine-scale crater shadows are not modeled. WebGL failure shows an explanation; the original photograph/mask renderer has been removed.

Credits and asset regeneration: [lunar data](images/LUNAR-DATA.md). Independent checks: `node tests/renderer.mjs`; report: [renderer test report](docs/renderer-test-report.md). Real-phone GPU and Safari checks remain pending.
