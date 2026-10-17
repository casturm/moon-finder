# Heading-up portrait compass verification

Status: independent browser verification complete. Tests exercise real DOM and application math with mocked heading/location inputs; they do not establish physical compass accuracy.

Run: `node tests/ui.mjs` using bundled Playwright and desktop Chrome. Pinned SunCalc and mocked zero magnetic declination keep fixtures deterministic. Browser viewport resize drives the actual orientation media query.

## Verified behavior

- Phone marker stays at screen top while the Moon marker uses the shortest target-minus-phone bearing.
- Heading cases 0°, 90°, 180°, 270°, 359°, and 1° position all four cardinal labels correctly, retaining upright text.
- Facing south places S at top, N at bottom, E left, and W right. A Moon directly behind appears at bottom.
- Existing ±4.9° alignment cases turn rings green; ±5.1° remains separate. Below-horizon alignment retains its explicit label.
- Landscape displays a rotate-to-portrait message and hides the dial/status content while retaining Show/Hide.
- Heading inputs in landscape are ignored; heading is cleared and one sensor listener remains. More than five seconds in landscape does not trigger the missing-heading timeout.
- Returning to portrait requires a fresh heading before revealing the dial. A fresh reading restores guidance.
- Date stepping continues in landscape. Hide removes the sensor listener; existing pagehide cleanup remains covered.
- Starting directly in landscape also waits without timing out.
- Existing debug, time validation/playback, permission failures, missing location, and mobile layout checks remain covered.

Artifacts: `/tmp/moon-finder-test-results/ui-results.json`, `compass-heading-south.png`, `compass-separate.png`, `compass-aligned.png`. The south-facing screenshot was inspected visually and matches the intended heading-up arrangement.

## Limits

No physical iPhone/Android compass calibration, Safari orientation API, true/magnetic-north accuracy, or tilt compensation was tested. The UI explicitly instructs users to hold the phone flat in portrait. Landscape media-query behavior was exercised through browser viewport dimensions, not a physical device rotation.

Tested SHA-256:

```
5a5e8cec029e3ece1bdf4ea5f49b39c741c49fda2f392bc006cbe11c3d77f928 app.js
6906009ce43f1a967351812a782060475d1c302a09594f6f0655193e756c97b3 index.html
```
