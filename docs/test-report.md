# Independent test report

Status: automated verification complete; physical-device review remains NOT RUN. Product merge/release requires tech-lead review.

Tested October 16, 2026, America/Los_Angeles. Requirements: approved `docs/requirements.md`. Base commit: `2eb60f2cc1895a3478f332cfaa2cfa69ad98fd8b`; product is an uncommitted working-tree snapshot in `/Users/chris/.codex/worktrees/moon-product/moon-finder`.

## Snapshot SHA-256

- `app.js`: `ff58038546cfce60170406e62c011f88af5d91c41a26fc62369658d65fb99a82`
- `moon-model.js`: `2eae7f7caeefd76f299b58a1ec12358d7fd9228aef7574c7edd5edaf730cc5c4`
- `index.html`: `a9ee5374734f21294cfa1ff79055700304644a58675724f3ee313b0992bfd4a8`
- `style.css`: `df16b4b5cba6de24c884be4f810f54a5f09fdba19efa700b116e9e19e62b256a`

## Environment and results

Node 22.15.0; installed macOS Google Chrome headless through bundled Playwright. Device timezone America/Los_Angeles; desktop 1280×1000 and mobile 320×780. SunCalc pinned 1.9.0 downloaded fixture; magnetic correction is mocked to zero, geolocation Portland and orientation/permission are simulated. No new application dependency installed.

Commands: `TZ=America/Los_Angeles node tests/run.mjs` and `TZ=America/Los_Angeles node tests/ui.mjs`, from the implementation checkout. Both exited 0. Thirteen grouped checks passed.

| Check | Result |
| --- | --- |
| G1/G2 spherical terminator independent normal oracle | PASS |
| C3 shortest turn and wraparound | PASS |
| G3 rotation convention | PASS |
| T2 calendar days across DST, month/year, leap day | PASS |
| A1 independent USNO dated phase fixtures | PASS |
| G4 independent local tangent-plane bright direction | PASS |
| D1 debug exact opt-in | PASS |
| T1/T2/T3 synchronized dates and validation | PASS |
| T4 playback pause manual step and bounds | PASS |
| C1/C3 show hide headings and listener lifecycle | PASS |
| C2 denied exception unsupported timeout | PASS |
| L1 unavailable location preserves phase | PASS |
| V1 mobile layout and phase screenshots | PASS |

Geometry samples use an independent sphere-normal oracle, excluding boundary points. Dated phases use USNO fixture tolerances; local-sky tilt uses a separately calculated horizontal tangent projection at three times in Portland, Sydney and Quito (nine cases). Browser coverage includes exact debug switch, date/DST/invalid input, playback/manual pause/upper bound, 100 date changes without listener multiplication, show/hide, BFCache hide/restore reset, permission denial/exception/unsupported/no-reading timeout, invalid headings, and unavailable location.

## Visual evidence

[Mobile diagnostic view](/tmp/moon-finder-test-results/mobile-debug.png) and eight phase captures are in `/tmp/moon-finder-test-results/`: new, waxing-crescent, first-quarter, waxing-gibbous, full, waning-gibbous, last-quarter, waning-crescent. JSON evidence: [model results](/tmp/moon-finder-test-results/model-results.json), [UI results](/tmp/moon-finder-test-results/ui-results.json).

Manually inspected mobile diagnostic layout and waning crescent capture: controls fit 320px without horizontal overflow, phase limb is circular with a smooth elliptical terminator and aligned texture. Other screenshots were generated but have not each been manually inspected.

## Limitations and pending checks

- NOT RUN: real iOS Safari and Android secure-context permission flows, sensor heading accuracy/calibration and portrait/landscape behavior. Mocks cannot validate these.
- NOT RUN: 200% browser zoom, desktop manual visual pass, blocked astronomy CDN, background playback transition, ambiguous DST input and keyboard/screen-reader manual audit. Scope includes code review evidence for these but automation did not cover them.
- Geographic orientation tests validate integration with pinned SunCalc, not high-precision ephemeris accuracy over 1900–2100. Magnetic-model service itself and nonzero correction were mocked.
- Production fixes after these hashes require affected retesting. No outstanding failure was observed in the executed checks; this report does not claim every planned test was executed.

## Mobile layout follow-up (pending user review)

Changed only `style.css` after the tested snapshot above: constrained native date input and grid button widths; moved the background to a fixed viewport pseudo-element with portrait framing at right/bottom. Prior CSS hash no longer describes the current stylesheet; application JavaScript remains unchanged.

Focused Chrome checks passed at 320×780, 390×844, 430×932 and 1280×800: date field and all four time buttons remain inside the panel, no page horizontal overflow, background layer matches viewport height and selects the appropriate portrait/landscape image. Manually inspected the 390px screenshot: horizon and trees visible, date control fits. Native iOS Safari confirmation remains pending; a WebKit browser binary was unavailable locally.

## Concentric compass follow-up

Implemented north-up concentric rings with crescent Moon and triangle phone markers. Unaligned phone ring is red; within five degrees rings share radius and turn green. Cardinal phone heading replaces numeric turn instructions. Below-horizon alignment has explicit wording; Show/Hide and sensor lifecycle are retained.

Coordinator-run browser verification: `TZ=America/Los_Angeles node tests/ui.mjs` exited 0, all eight UI groups passed, including the new C4 check. C4 covers opposite headings, both sides of the 5° boundary, merged ring radius/color, marker rotation, facing label, below-horizon message, 320px overflow, and Hide cleanup. Existing permission, time, debug, and lifecycle checks also passed. These follow-up checks were not performed by an independent agent. Real phone behavior remains unverified.

Final follow-up SHA-256:
- app.js: `f81584007f6b2fad28a7b8eee418ea6272de51352231171b8126b59739ded8a8`
- index.html: `aad5ed0fdac89ebe9dae9a9a10daed05fc8790405751e00c820296bce8354be8`
- style.css: `7353bf232ac019cc7d084b79c95441326b0e96b9d54ec27318f605a0e9624dec`

Evidence: `/tmp/moon-finder-test-results/compass-separate.png` and `/tmp/moon-finder-test-results/compass-aligned.png`. Both states reviewed visually at phone width. JavaScript syntax and `git diff --check` passed.
