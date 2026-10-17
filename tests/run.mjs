import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";

const root = resolve(process.env.MOON_ROOT || ".");
const out = resolve(
  process.env.MOON_TEST_OUTPUT || "/tmp/moon-finder-test-results",
);
await mkdir(out, { recursive: true });
const model = await import(
  `data:text/javascript;base64,${Buffer.from(await readFile(resolve(root, "moon-model.js"))).toString("base64")}`
);
const results = [];
async function test(id, fn) {
  try {
    const details = await fn();
    results.push({ id, status: "PASS", details });
    console.log(`PASS ${id}`);
  } catch (e) {
    results.push({ id, status: "FAIL", details: e.stack });
    console.error(`FAIL ${id}: ${e.message}`);
  }
}
await test("C3 shortest turn and wraparound", () => {
  assert.equal(model.shortestTurn(1, 359), 2);
  assert.equal(model.shortestTurn(359, 1), -2);
  assert.equal(model.shortestTurn(90, 90), 0);
  assert.equal(model.normalizeDegrees(-1), 359);
  assert.equal(model.normalizeDegrees(360), 0);
});
await test("G3 rotation convention", () => {
  for (const theta of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.37]) {
    const rotation = (model.brightLimbRotation(theta, 0) * Math.PI) / 180;
    assert.ok(Math.abs(Math.cos(rotation) + Math.sin(theta)) < 1e-10);
    assert.ok(Math.abs(Math.sin(rotation) + Math.cos(theta)) < 1e-10);
  }
});
await test("T2 calendar days across DST, month/year, leap day", () => {
  assert.equal(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    "America/Los_Angeles",
    "run with TZ=America/Los_Angeles",
  );
  for (const [input, days, expected, hours] of [
    ["2026-03-07T12:00", 1, "2026-03-08T12:00", 23],
    ["2026-10-31T12:00", 1, "2026-11-01T12:00", 25],
    ["2026-12-31T12:00", 1, "2027-01-01T12:00", 24],
    ["2028-02-28T12:00", 1, "2028-02-29T12:00", 24],
  ]) {
    const start = new Date(input),
      actual = model.stepCalendarDays(start, days);
    assert.equal(+actual, +new Date(expected));
    assert.equal((actual - start) / 36e5, hours);
  }
});
let suncalc;
await test("A1 independent USNO dated phase fixtures", async () => {
  const source = await readFile(
    process.env.SUNCALC_FIXTURE || "/tmp/moon-test-suncalc.js",
    "utf8",
  );
  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox);
  suncalc = sandbox.SunCalc;
  const records = [];
  for (const [utc, phase, fraction] of [
    ["2026-10-10T15:50:00Z", 0, 0],
    ["2026-10-18T16:12:00Z", 0.25, 0.5],
    ["2026-10-26T04:12:00Z", 0.5, 1],
    ["2026-11-01T20:28:00Z", 0.75, 0.5],
  ]) {
    const a = suncalc.getMoonIllumination(new Date(utc));
    assert.ok(
      Math.min(Math.abs(a.phase - phase), 1 - Math.abs(a.phase - phase)) < 0.02,
    );
    assert.ok(Math.abs(a.fraction - fraction) < 0.02);
    records.push({ utc, ...a });
  }
  return records;
});
await test("G4 independent local tangent-plane bright direction", () => {
  assert.ok(suncalc, "requires pinned astronomy fixture");
  const cases = [];
  for (const utc of [
    "2026-10-14T03:00:00Z",
    "2026-10-20T09:00:00Z",
    "2026-10-30T15:00:00Z",
  ])
    for (const [lat, lng] of [
      [45.5152, -122.6784],
      [-33.8688, 151.2093],
      [-0.1807, -78.4678],
    ]) {
      const date = new Date(utc),
        moon = suncalc.getMoonPosition(date, lat, lng),
        sun = suncalc.getPosition(date, lat, lng),
        illum = suncalc.getMoonIllumination(date); // Horizontal azimuth convention cancels in angle difference. Refraction is removed for this geometric projection.
      const refr = (h) =>
        0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
      let h = moon.altitude;
      for (let i = 0; i < 8; i++) h = moon.altitude - refr(Math.max(h, 0));
      const delta = sun.azimuth - moon.azimuth;
      const right = Math.cos(sun.altitude) * Math.sin(delta);
      const up =
        Math.sin(sun.altitude) * Math.cos(h) -
        Math.cos(sun.altitude) * Math.sin(h) * Math.cos(delta);
      const actual =
        (model.brightLimbRotation(illum.angle, moon.parallacticAngle) *
          Math.PI) /
        180;
      const norm = Math.hypot(right, up);
      const dot = (Math.cos(actual) * right - Math.sin(actual) * up) / norm;
      const error = (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI;
      assert.ok(error < 2, `${utc} ${lat},${lng}: ${error}°`);
      cases.push({ utc, lat, lng, error });
    }
  return cases;
});
await writeFile(
  resolve(out, "model-results.json"),
  JSON.stringify(results, null, 2),
);
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
