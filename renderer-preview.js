import { calculateMoon, stepCalendarDays, validDate } from "./moon-model.js";
import { MoonRenderer } from "./moon-renderer.js";
import { surfaceRotation } from "./moon-surface-orientation.js";

const $ = (id) => document.getElementById(id);
const references = {
  portland: { latitude: 45.5152, longitude: -122.6784 },
  sydney: { latitude: -33.8688, longitude: 151.2093 },
  quito: { latitude: -0.1807, longitude: -78.4678 },
};
let date = new Date(),
  location = references.portland,
  playback = null;
const localInput = (value) => {
  const part = (number) => String(number).padStart(2, "0");
  return `${value.getFullYear()}-${part(value.getMonth() + 1)}-${part(value.getDate())}T${part(value.getHours())}:${part(value.getMinutes())}`;
};
$("preview-timezone").textContent =
  Intl.DateTimeFormat().resolvedOptions().timeZone;
const renderer = new MoonRenderer($("surface-moon"), {
  onStatus(status, message) {
    $("renderer-status").textContent =
      status === "ready"
        ? "Sunlight and terrain, with a faint dark side."
        : message;
    $("surface-moon").hidden = status !== "ready";
  },
});

function update() {
  if (!window.SunCalc) {
    $("preview-error").textContent =
      "Moon calculations could not load. Check your connection and reload.";
    return;
  }
  const moon = calculateMoon(window.SunCalc, date, location);
  $("preview-date").value = localInput(date);
  $("preview-phase").textContent =
    `${moon.name} · ${Math.round(moon.fraction * 100)}% illuminated · ${date.toLocaleString()}`;
  renderer.render({
    fraction: moon.fraction,
    rotation: moon.rotation,
    surfaceRotation: surfaceRotation(date, moon.parallacticAngle),
  });
  $("surface-moon").setAttribute(
    "aria-label",
    `${moon.name}, ${Math.round(moon.fraction * 100)}% illuminated, surface lighting preview`,
  );
  document.querySelectorAll("[data-date]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(new Date(button.dataset.date).getTime() === date.getTime()),
    );
  });
}
function pause() {
  clearInterval(playback);
  playback = null;
  $("preview-play").textContent = "Play";
  $("preview-play").setAttribute("aria-pressed", "false");
}
function select(next) {
  if (!validDate(next)) {
    pause();
    $("preview-error").textContent =
      "Choose a valid date between 1900 and 2100.";
    update();
    return;
  }
  $("preview-error").textContent = "";
  date = next;
  update();
}
document.querySelectorAll("[data-date]").forEach((button) => {
  button.addEventListener("click", () => {
    pause();
    select(new Date(button.dataset.date));
  });
});
$("preview-date").addEventListener("change", (event) => {
  pause();
  select(new Date(event.target.value));
});
$("preview-previous").addEventListener("click", () => {
  pause();
  select(stepCalendarDays(date, -1));
});
$("preview-next").addEventListener("click", () => {
  pause();
  select(stepCalendarDays(date, 1));
});
$("preview-now").addEventListener("click", () => {
  pause();
  select(new Date());
});
$("preview-play").addEventListener("click", () => {
  if (playback) {
    pause();
    return;
  }
  $("preview-play").textContent = "Pause";
  $("preview-play").setAttribute("aria-pressed", "true");
  playback = setInterval(() => select(stepCalendarDays(date, 1)), 1000);
});
$("preview-location").addEventListener("change", (event) => {
  location = references[event.target.value];
  $("preview-location-status").textContent =
    `Using ${event.target.selectedOptions[0].textContent} as a reference location.`;
  update();
});
$("preview-use-location").addEventListener("click", () => {
  if (!navigator.geolocation) {
    $("preview-location-status").textContent =
      "Location unavailable. Select a reference location instead.";
    return;
  }
  $("preview-location-status").textContent = "Requesting your location…";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      let option = $("preview-location").querySelector('[value="current"]');
      if (!option) {
        option = new Option("My current location", "current");
        $("preview-location").add(option);
      }
      references.current = location;
      $("preview-location").value = "current";
      $("preview-location-status").textContent = "Using your current location.";
      update();
    },
    () => {
      $("preview-location-status").textContent =
        "Location unavailable. Keeping the selected reference location.";
    },
    { timeout: 10000, maximumAge: 300000 },
  );
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("pagehide", pause);
window.addEventListener("resize", () => renderer.render());
update();
