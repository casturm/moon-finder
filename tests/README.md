# Independent acceptance checks

Run the model checks from the implementation checkout with Node 22+:

```sh
curl -L --fail https://cdn.jsdelivr.net/npm/suncalc@1.9.0/suncalc.js -o /tmp/moon-test-suncalc.js
TZ=America/Los_Angeles node tests/run.mjs

# Browser suites additionally require Playwright and Chrome:
TZ=America/Los_Angeles node tests/ui.mjs
node tests/renderer.mjs
node tests/main-renderer.mjs
```

The default Playwright package path is the Codex bundled runtime and the default browser is installed macOS Google Chrome. Set `PLAYWRIGHT_PATH` to another installed Playwright module and `CHROME_PATH` to a compatible browser executable. `SUNCALC_FIXTURE` overrides the downloaded SunCalc file, `MOON_ROOT` overrides the app checkout, and `MOON_TEST_OUTPUT` overrides `/tmp/moon-finder-test-results`.

The pinned SunCalc fixture supplies astronomy inputs. USNO dated phases provide independent expected ranges. Sphere-normal classification supplies independent geometry expectations, while a local horizontal tangent-plane projection checks orientation without repeating the production bright-limb angle formula. Sensor/browser mocks do not establish real-device compass accuracy.

The checks do not install or change app dependencies. Reports identify mocked inputs and physical-device checks that were not performed.
