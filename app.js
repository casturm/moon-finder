import {
  calculateMoon,
  normalizeDegrees,
  shortestTurn,
  stepCalendarDays,
  validDate,
} from "./moon-model.js";
import { MoonRenderer } from "./moon-renderer.js";
import { surfaceRotation } from "./moon-surface-orientation.js";
import { parseDebugLocation, installDebugLocation } from "./debug-location.js";
const $ = (id) => document.getElementById(id);
const debug = new URLSearchParams(location.search).get("debug") === "1";
const state = {
  date: new Date(),
  mode: "live",
  location: null,
  locationSource: null,
  moon: null,
  visible: false,
  compass: "hidden",
  heading: null,
  source: null,
  headingAccuracy: null,
  declination: null,
  renderer: "loading",
  sensor: null,
};
const landscapeCompass = window.matchMedia("(orientation: landscape)");
let orientationEvent = "deviceorientation";
let lowAccuracySince = null;
let accuracyWarning = false;
let playback = null,
  headingTimeout = null,
  listening = false,
  permissionAttempt = 0,
  magvarPromise;
$("debug-panel").hidden = !debug;
if (debug) installDebugLocation($("debug-panel"), new URL(location.href));
$("timezone").textContent =
  `(${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
const moonRenderer = new MoonRenderer($("moon-surface"), {
  onStatus(status) {
    state.renderer = status;
    updateMoonVisibility();
    diagnostics();
  },
});
function updateMoonVisibility() {
  const natural = state.renderer === "ready" && state.moon !== null;
  $("moon-surface").hidden = !natural;
  const message =
    state.renderer === "lost"
      ? "Restoring the Moon view…"
      : ["unavailable", "error"].includes(state.renderer)
        ? "Moon view unavailable. Reload to retry. Phase information and time controls are still available."
        : state.renderer === "loading"
          ? "Loading the Moon view…"
          : "";
  if ($("moon-render-status").textContent !== message) {
    $("moon-render-status").textContent = message;
  }
}
const localInput = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
function diagnostics() {
  if (debug)
    $("debug-content").textContent = JSON.stringify(
      { ...state, date: state.date.toISOString() },
      null,
      2,
    );
}
function render() {
  if (!window.SunCalc) {
    $("sky-status").textContent =
      "Moon calculations could not load. Check your connection and reload.";
    return;
  }
  state.moon = calculateMoon(window.SunCalc, state.date, state.location);
  const moon = state.moon;
  $("phase").textContent = moon.name;
  $("illumination").textContent = Math.round(moon.fraction * 100);
  $("moon-surface").setAttribute(
    "aria-label",
    `${moon.name}, ${Math.round(moon.fraction * 100)}% illuminated. ${state.location ? "Oriented relative to your local horizon." : "Location needed for local sky orientation."}`,
  );
  moonRenderer.render({
    fraction: moon.fraction,
    rotation: moon.rotation ?? -90 - (moon.angle * 180) / Math.PI,
    surfaceRotation: surfaceRotation(state.date, moon.parallacticAngle ?? 0),
  });
  updateMoonVisibility();
  $("altitude").textContent = state.location
    ? `${Math.abs(moon.altitude).toFixed(1)}°`
    : "—";
  $("altitude-descriptor").textContent = state.location
    ? moon.altitude < 0
      ? "below horizon"
      : "above horizon"
    : "Location needed";
  $("azimuth").textContent = state.location
    ? `${Math.round(moon.azimuth) % 360}°`
    : "—";
  $("direction").textContent = state.location
    ? moon.direction
    : "Location needed";
  $("sky-status").textContent = state.location
    ? moon.altitude < 0
      ? "Below your horizon at this time."
      : "Moon orientation matches your local sky."
    : "Location needed for local sky orientation and direction.";
  $("selected-date").value = localInput(state.date);
  $("selected-time").textContent = state.date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
  $("time-mode").textContent =
    state.mode === "live"
      ? "Live · Now"
      : state.mode === "playing"
        ? "Exploring · Playing"
        : "Exploring · Paused";
  $("compass-context").textContent =
    state.mode === "live"
      ? "Moon’s current direction · Turn your phone to align the markers."
      : `Moon’s direction on ${state.date.toLocaleString()} · Using your phone’s current heading.`;
  renderFinder();
  diagnostics();
}
function pause() {
  clearInterval(playback);
  playback = null;
  if (state.mode === "playing") state.mode = "selected";
  $("play").textContent = "Play";
  $("play").setAttribute("aria-pressed", "false");
}
function selectDate(date) {
  pause();
  if (!validDate(date)) {
    $("time-error").textContent = "Choose a valid date between 1900 and 2100.";
    render();
    return;
  }
  $("time-error").textContent = "";
  state.date = date;
  state.mode = "selected";
  render();
}
$("selected-date").addEventListener("change", (event) =>
  selectDate(new Date(event.target.value)),
);
$("previous-day").addEventListener("click", () =>
  selectDate(stepCalendarDays(state.date, -1)),
);
$("next-day").addEventListener("click", () =>
  selectDate(stepCalendarDays(state.date, 1)),
);
$("now").addEventListener("click", () => {
  pause();
  state.mode = "live";
  state.date = new Date();
  $("time-error").textContent = "";
  render();
});
$("play").addEventListener("click", () => {
  if (playback) {
    pause();
    render();
    return;
  }
  state.mode = "playing";
  $("play").textContent = "Pause";
  $("play").setAttribute("aria-pressed", "true");
  playback = setInterval(() => {
    const date = stepCalendarDays(state.date, 1);
    if (!validDate(date)) {
      pause();
      $("time-error").textContent =
        "Playback stopped at the supported date limit (1900–2100).";
      render();
      return;
    }
    state.date = date;
    render();
  }, 1000);
  render();
});
setInterval(() => {
  if (state.mode === "live" && !document.hidden) {
    state.date = new Date();
    render();
  }
}, 30000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
  else if (state.mode === "live") state.date = new Date();
  if (state.visible && listening) updateCompassLayout();
  render();
});
function compassStatus(status, message, retry = false) {
  state.compass = status;
  if ($("compass-status").textContent !== message) {
    $("compass-status").textContent = message;
  }
  $("compass-retry").hidden = !retry;
  renderFinder();
  diagnostics();
}
function renderFinder() {
  const landscape = landscapeCompass.matches;
  $("compass-portrait-message").hidden = !state.visible || !landscape;
  $("compass-portrait-content").hidden = landscape;
  const ready =
    !landscape &&
    state.visible &&
    state.heading !== null &&
    state.moon?.azimuth !== undefined;
  $("orientation").hidden = !ready;
  const pending = state.visible && !landscape && !document.hidden &&
    ["waiting", "calibrating"].includes(state.compass) && !ready;
  $("compass-pending").hidden = !pending;
  $("compass-pending").textContent = state.compass === "calibrating"
    ? "Waiting for a usable compass reading…"
    : "Waiting for your phone’s compass…";
  $("orientation").classList.toggle("uncertain", ready && state.compass === "uncertain");
  if (!ready) return;
  const difference = shortestTurn(state.moon.azimuth, state.heading),
    aligned = state.compass !== "uncertain" && Math.abs(difference) <= 5;
  const facing = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
    Math.round(state.heading / 45) % 8
  ];
  $("orientation").classList.toggle("aligned", aligned);
  $("moon-bearing-marker").setAttribute(
    "transform",
    `rotate(${difference} 140 140)`,
  );
  $("phone-heading-marker").setAttribute("transform", "rotate(0 140 140)");
  // Each cardinal keeps its text upright while its position follows heading.
  document
    .querySelectorAll(".compass-cardinals [data-bearing]")
    .forEach((label) => {
      const relative =
        ((Number(label.dataset.bearing) - state.heading) * Math.PI) / 180;
      label.setAttribute("x", String(140 + 120 * Math.sin(relative)));
      label.setAttribute("y", String(140 - 120 * Math.cos(relative) + 5));
    });
  $("phone-ring").setAttribute("r", aligned ? "94" : "76");
  $("phone-pointer").setAttribute(
    "transform",
    aligned ? "translate(0 -18)" : "translate(0 0)",
  );
  $("phone-direction").textContent = facing;
  const instruction = state.compass === "uncertain"
    ? "Approximate direction · Compass accuracy is low"
    : aligned
    ? state.moon.altitude < 0
      ? "Bearing aligned · Moon below horizon"
      : "Aligned with Moon"
    : "Point the top of your phone toward the Moon";
  if ($("finder-instruction").textContent !== instruction) {
    $("finder-instruction").textContent = instruction;
  }
  $("compass-description").textContent =
    `Moon bearing ${state.moon.direction}. Phone facing ${facing}. ${instruction}.`;
}
function stopSensors() {
  clearTimeout(headingTimeout);
  if (listening) {
    window.removeEventListener(orientationEvent, handleOrientation);
    listening = false;
  }
  state.heading = null;
  state.source = null;
  state.headingAccuracy = null;
  state.sensor = null;
  lowAccuracySince = null;
  accuracyWarning = false;
}
function handleOrientation(event) {
  if (!state.visible || document.hidden || landscapeCompass.matches) return;
  state.sensor = {
    receivedAt: Date.now(), magnetic: event.webkitCompassHeading,
    alpha: event.alpha, beta: event.beta, gamma: event.gamma,
    accuracy: event.webkitCompassAccuracy, absolute: event.absolute,
    eventType: event.type,
  };
  let heading, source;
  const accuracy = event.webkitCompassAccuracy;
  if (
    Number.isFinite(event.webkitCompassHeading) &&
    event.webkitCompassHeading >= 0
  ) {
    if (Number.isFinite(accuracy) && accuracy < 0) {
      state.heading = null;
      state.source = null;
      state.headingAccuracy = accuracy;
      lowAccuracySince = null;
      accuracyWarning = false;
      clearTimeout(headingTimeout);
      compassStatus(
        "calibrating",
        "Compass reading is unreliable. Move away from magnets or metal and move your phone to help it calibrate, then hold it flat in portrait.",
        true,
      );
      return;
    }
    if (state.declination === null) return;
    heading = event.webkitCompassHeading + state.declination;
    source = "Magnetic compass + declination";
  } else if (event.absolute === true && Number.isFinite(event.alpha)) {
    heading = 360 - event.alpha;
    source = "Absolute orientation (true north)";
  } else return;
  state.headingAccuracy =
    source === "Magnetic compass + declination" && Number.isFinite(accuracy)
      ? accuracy
      : null;
  state.heading = normalizeDegrees(heading);
  state.sensor.acceptedAt = Date.now();
  state.source = source;
  clearTimeout(headingTimeout);
  // Warn only after sustained poor accuracy; a lower recovery threshold prevents flicker.
  if (state.headingAccuracy === null || state.headingAccuracy <= 20) {
    lowAccuracySince = null;
    accuracyWarning = false;
  } else if (state.headingAccuracy > 30) {
    lowAccuracySince ??= performance.now();
    if (performance.now() - lowAccuracySince >= 1500) accuracyWarning = true;
  } else if (!accuracyWarning) {
    lowAccuracySince = null;
  }
  const uncertain = accuracyWarning;
  compassStatus(
    uncertain ? "uncertain" : "active",
    uncertain
      ? "Compass accuracy is low. Direction is approximate; keep your phone flat and away from magnets or metal."
      : state.location
        ? "Compass active. Hold your phone flat in portrait, with its top edge pointing ahead."
        : "Compass active. Location needed for Moon guidance.",
  );
}
function updateCompassLayout() {
  clearTimeout(headingTimeout);
  state.heading = null;
  state.source = null;
  state.headingAccuracy = null;
  state.sensor = null;
  lowAccuracySince = null;
  accuracyWarning = false;
  if (!state.visible || !listening) {
    renderFinder();
    diagnostics();
    return;
  }
  if (document.hidden) {
    compassStatus("paused", "Compass paused while the app is in the background.");
    return;
  }
  if (landscapeCompass.matches) {
    compassStatus("paused", "Compass paused in landscape.");
    return;
  }
  compassStatus("waiting", "Waiting for a compass heading…");
  headingTimeout = setTimeout(() => {
    stopSensors();
    compassStatus(
      "unavailable",
      "No usable compass heading arrived. Check sensor permissions and try again.",
      true,
    );
  }, 5000);
}
landscapeCompass.addEventListener("change", updateCompassLayout);
async function showCompass() {
  stopSensors();
  const attempt = ++permissionAttempt;
  state.visible = true;
  $("compass-content").hidden = false;
  $("compass-button").textContent = "Hide compass";
  $("compass-button").setAttribute("aria-expanded", "true");
  if (typeof window.DeviceOrientationEvent === "undefined") {
    compassStatus(
      "unavailable",
      "Compass sensors are unavailable on this device. Use the Moon bearing above.",
      true,
    );
    return;
  }
  compassStatus("permission", "Requesting compass access…");
  try {
    if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
      const permission =
        await window.DeviceOrientationEvent.requestPermission();
      if (attempt !== permissionAttempt || !state.visible) return;
      if (permission !== "granted") {
        compassStatus(
          "denied",
          "Compass permission was denied. Allow motion and orientation access in your browser to retry.",
          true,
        );
        return;
      }
    }
    if (attempt !== permissionAttempt || !state.visible) return;
    orientationEvent =
      "ondeviceorientationabsolute" in window
        ? "deviceorientationabsolute"
        : "deviceorientation";
    window.addEventListener(orientationEvent, handleOrientation);
    listening = true;
    updateCompassLayout();
  } catch {
    if (attempt === permissionAttempt && state.visible)
      compassStatus(
        "error",
        "Compass access failed. Check browser permissions and try again.",
        true,
      );
  }
}
$("compass-button").addEventListener("click", () => {
  if (!state.visible) {
    showCompass();
    return;
  }
  ++permissionAttempt;
  state.visible = false;
  stopSensors();
  $("compass-content").hidden = true;
  $("compass-button").textContent = "Show compass";
  $("compass-button").setAttribute("aria-expanded", "false");
  compassStatus("hidden", "");
});
$("compass-retry").addEventListener("click", showCompass);
function requestLocation() {
  $("location-retry").hidden = true;
  $("location-status").textContent = "Requesting your location…";
  if (!navigator.geolocation) {
    locationFailure();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      state.locationSource = "gps";
      $("location-status").textContent = "Using your current location.";
      render();
      updateDeclination();
    },
    locationFailure,
    { timeout: 10000, maximumAge: 300000 },
  );
}
async function updateDeclination() {
  try {
    magvarPromise ??= import("https://esm.sh/magvar@2.2.0");
    const { magvar } = await magvarPromise;
    const correction = magvar(state.location.latitude, state.location.longitude);
    state.declination = Number.isFinite(correction) ? correction : null;
  } catch {
    state.declination = null;
  }
  diagnostics();
}
function locationFailure() {
  $("location-status").textContent =
    "Location unavailable. Allow location access to see the Moon in your local sky.";
  $("location-retry").hidden = false;
  render();
}
$("location-retry").addEventListener("click", requestLocation);
window.addEventListener("pagehide", () => {
  pause();
  ++permissionAttempt;
  state.visible = false;
  stopSensors();
  $("compass-content").hidden = true;
  $("compass-button").textContent = "Show compass";
  $("compass-button").setAttribute("aria-expanded", "false");
  compassStatus("hidden", "");
});
window.addEventListener("pageshow", () => {
  if (state.mode === "live") state.date = new Date();
  render();
});
window.addEventListener("resize", () => moonRenderer.render());
render();
const testLocation = new URLSearchParams(location.search).get("location");
if (debug && testLocation !== null) {
  try {
    state.location = parseDebugLocation(testLocation);
    state.locationSource = "test override";
    $("location-status").textContent = `Test location: ${state.location.latitude}, ${state.location.longitude}. Compass correction also uses this location; use GPS for physical field checks.`;
    render();
    updateDeclination();
  } catch (error) {
    $("location-status").textContent = "Invalid test location. Correct it in Test location below or choose Use my GPS location.";
    $("test-location-error").textContent = error.message;
  }
} else {
  requestLocation();
}

if (debug) import("./validation-tools.js").then(({installValidation}) => installValidation(() => state));
