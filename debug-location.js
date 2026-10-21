export function parseDebugLocation(value) {
  if (typeof value !== "string") throw new Error("Enter latitude,longitude.");
  const parts = value.split(",").map(part => part.trim());
  if (parts.length !== 2 || parts.some(part => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(part))) {
    throw new Error("Enter latitude,longitude, for example 45.514615,-122.641564.");
  }
  const [latitude, longitude] = parts.map(Number);
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    throw new Error("Latitude must be −90 to 90; longitude must be −180 to 180.");
  }
  return { latitude, longitude };
}

export function installDebugLocation(panel, url) {
  const section = document.createElement("section");
  section.innerHTML = `
    <h2>Test location</h2>
    <p>Override the observer location for Moon, Sun, and landmark calculations. Applying reloads the page. Your physical compass stays live.</p>
    <form method="get">
      <input type="hidden" name="debug" value="1">
      <label for="test-location">Latitude,longitude (west is negative)</label>
      <input id="test-location" name="location" type="text" required placeholder="45.514615,-122.641564" aria-describedby="test-location-error">
      <button type="submit">Apply test location</button>
    </form>
    <p id="test-location-error" role="status"></p>
    <a id="test-location-gps">Use my GPS location</a>
  `;
  section.querySelector("form").action = url.pathname;
  const gps = new URL(url);
  gps.searchParams.delete("location");
  section.querySelector("#test-location-gps").href = gps.href;
  const input = section.querySelector("input[name=location]");
  input.value = url.searchParams.get("location") ?? "";
  section.querySelector("form").addEventListener("submit", event => {
    try {
      parseDebugLocation(input.value);
      section.querySelector("#test-location-error").textContent = "";
    } catch (error) {
      event.preventDefault();
      section.querySelector("#test-location-error").textContent = error.message;
    }
  });
  panel.prepend(section);
}
