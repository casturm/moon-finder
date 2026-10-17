# Independent lunar renderer preview test report

Status: nine grouped browser checks passed. Visual approval and code approval are pending. This is a separate preview, not authorization to replace the main app renderer or integrate production changes.

Tested locally on `codex/moon-product-review`, using real headless Google Chrome WebGL, local NASA textures, and the existing pinned SunCalc fixture. Run `node tests/renderer.mjs` (local server and Chrome require permission outside the restricted sandbox). Results and screenshots: `/tmp/moon-renderer-results/`.

## Evidence

| Check | Result |
| --- | --- |
| R1 actual WebGL canvas | Nonblank textured sphere, central full-Moon mean 159/255, standard deviation 24; capped resolution |
| R2 phase and orientation | Independent normal-dot-light oracle checks 10%, 25%, 50%, 75%, 90% phases at four cardinal rotations; expected lit samples bright, deep night samples black with earthshine disabled |
| R3 dark side | Explicit 0.0006 default coefficient with approximate Earth-phase scaling produces new/full central brightness ratio 3.35%, substantially below the old 17% photographic layer |
| R8 terrain | Relief-on/off comparison changes 47% of sampled terminator-band pixels by more than 3 levels; mean difference 9/255 |
| R4 repeated rendering | 120 on-demand updates plus synchronous readback completed in 15.5 ms on this desktop; not a phone frame-rate claim |
| R5 graphics recovery | Actual `WEBGL_lose_context` extension triggers lost status and restoration back to ready |
| R6 unavailable graphics | Forced missing WebGL resolves false with explanatory status; no constructor crash |
| R9 failed texture download | Aborted elevation request resolves false with error status |
| R7 layout and artifacts | No horizontal page overflow at 320, 390, 1280 CSS pixels; actual Crescent, Quarter, Gibbous, Full comparison screenshots captured |

Screenshots: `preview-320.png`, `preview-390.png`, `preview-1280.png`, `comparison-crescent.png`, `comparison-quarter.png`, `comparison-gibbous.png`, `comparison-full.png`. Machine results: `renderer-results.json`.

I visually inspected the quarter comparison. The new rendering shows terrain relief and a much fainter night side. Its rough, speckled terminator is visible and should be reviewed at actual phone size. Automated brightness/geometry checks cannot establish photographic realism or the exact geographic fidelity of individual craters.

## Limitations and review gates

- No physical iPhone/Android GPU, Safari, battery/thermal, or network download timing verification. Desktop timing does not predict phone performance.
- Surface rotation/lunar-axis approximations and fixed near-side geography do not model precise libration or eclipses. This report verifies screen-space light orientation independently, not a full ephemeris for texture orientation.
- Tests measure the renderer directly and preview responsiveness; they do not approve its appearance or integration. Current primary Moon rendering is intended to remain unchanged.
- Failed texture and unavailable graphics tests verify safe status behavior; users can return to the existing main view.

## Tested source fingerprints (SHA-256)

```
3a01899460f512823b16b72baf42dc19da87912d2db3997db77b04b8ae1be3a7 moon-renderer.js
4532485a8f7d916717b1dfcafb3c412dd30c4052895948ffc5a6f99e9347a78d renderer-preview.js
37b5d879122cafea6b94b614596ac7c3bf42ad32926bc43c5ae37159ab3b2af8 renderer-preview.html
f7130a1822681fa7512d7dcfd40db8c10b9ba4f06777910348698260ed7a2170 images/lunar-albedo.jpg
9bb13b76209d2b9bbd2b36f90fd86494d52c9915d2fccf151349d87c51081120 images/lunar-elevation.png
```

## Earthshine adjustment after visual feedback

User approved keeping the new renderer and requested a gentle lift in dark-side visibility. Raised the default earthshine coefficient from 0.0006 to 0.003, retaining phase scaling and terrain/direct sunlight calculations. Coordinator reran all nine grouped checks: PASS. The R3 test now exercises the renderer default rather than an explicit copied coefficient; measured new/full center brightness ratio is 6.97% (previously 3.35%). This is a display tuning measurement, not calibrated lunar photometry. Reviewed the updated crescent comparison screenshot.

Updated moon-renderer.js SHA-256: `0fb78de80cb1ad9f2b368695c895be3791bba8f9d3f59121995b2435e246cb0f`. Main app rendering remains unchanged pending preview review.
