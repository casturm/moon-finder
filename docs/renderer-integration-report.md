# Independent natural-renderer integration report

Status: all five integration groups, nine renderer groups, and eight existing UI regression groups passed after the user requested removal of the old renderer. This report does not authorize any Git merge, push, or deployment.

Tested current `codex/moon-product-review` working files using real headless desktop Chrome WebGL, local NASA textures, pinned local SunCalc, and simulated geolocation/sensor permissions. Commands: `node tests/main-renderer.mjs`, `node tests/renderer.mjs`, and `node tests/ui.mjs`. These require local-server/Chrome permissions outside the restricted sandbox.

## Verification

| Group | Evidence |
| --- | --- |
| M1 default and synchronized time | Main canvas visible; old SVG absent; nonblank actual WebGL pixels change across crescent, quarter, full dates while debug date, phase, percentage, and accessible description agree |
| M2 location orientation | Simulated Portland → Sydney changes local rotation and actual canvas pixels while preserving fraction; denied location retains natural phase display with unavailable direction/altitude |
| M3 unavailable graphics | Forced no-WebGL and aborted elevation load hide the canvas and show “Moon view unavailable”; old SVG absent; day stepping continues updating phase fraction and metadata |
| M4 graphics and page lifecycle | Actual WebGL context loss hides canvas and shows restoring status; time can change while lost; actual context restoration restores visible nonblank canvas; simulated pagehide/pageshow preserves rendering |
| M5 layout | No horizontal overflow at 320, 390, 1280 CSS pixels; canvas stays inside viewport; full-page screenshots captured |
| Renderer suite (9 groups) | Nonblank textured sphere, independent 20-case phase/orientation pixel oracle, subtle earthshine, terrain-on/off differences, repeated draws, real graphics loss/restoration, unavailable graphics, failed texture load, responsive preview and four real phase presets; old preview SVG/photo absent |
| Existing UI suite (8 groups) | Debug opt-in, date/DST/validation, playback, compass show/hide/listeners, denied/unsupported sensors, unavailable location, mobile screenshots, concentric alignment/below-horizon status all passed |

Static verification confirms the old `images/moon.png` asset is absent and main/preview application files no longer reference `illuminatedPath`, `moon-fallback`, `legacy-moon`, or that photograph.

Artifacts: `/tmp/moon-main-renderer-results/main-renderer-results.json` and `main-natural-{320,390,1280}.png`; renderer results `/tmp/moon-renderer-results/renderer-results.json`; existing UI results `/tmp/moon-finder-test-results/ui-results.json`. The preview screenshots now show only the natural renderer despite retaining historical comparison filenames.

The prior integration test caught a visibility bug when the SVG fallback still existed. That fix is superseded by removing the entire old SVG per user direction; it is not part of current behavior.

## Limits

No physical iPhone/Android or Safari GPU checks, battery/thermal measurements, real compass accuracy, or true browser back/forward-cache navigation were performed. Lifecycle events were simulated; context loss/restoration used the real WebGL extension. Appearance and physical-device behavior remain user review items. Devices without working WebGL show an explicit error and retain phase/time metadata; no older Moon graphic is substituted.

## Tested SHA-256 fingerprints

```
2cfa57abce9109ffcff01b6292feda4692500d9c51b0b01bb095496348f8d566 app.js
ff52512f8f085f7dc5969b711daf868676741553a0aa8ad98af307fbad75bc8b index.html
18cbae3b0a34f7a56f83e1001c512fed4594d02811f06a257ea4b2c903b12808 style.css
f3f40e125cb6e3e8cdc15ccaea62a9f552702ab606a4c970f1b5a9ed93828fef moon-renderer.js
18ca6bef0ff69e2a0bcaebde86f077b0b22c00d2ee5def9beb2de78af13018d0 moon-surface-orientation.js
```
