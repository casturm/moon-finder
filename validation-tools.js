import { landmarkBearing, referenceSun, turn, wrap } from './validation-model.js';
export function installValidation(getState) {
  const panel = document.getElementById('debug-panel');
  const section = document.createElement('section');
  section.innerHTML = `
    <h2>Compass field checks</h2>
    <p>Hold flat in portrait. Point the top edge at a known landmark, then rotate away and back. Repeat with a slight tilt and after reopening the page. Use Show compass above to start sensors.</p>
    <p>All reference bearings use true north. Phone readings are measurements, not proof of accuracy.</p>
    <pre id="validation-readings" aria-label="Compass measurements"></pre>
    <label for="check-target">Reference target</label>
    <select id="check-target"><option value="manual">Known true bearing</option><option value="landmark">Landmark coordinates</option><option value="sun">Sun (independent NOAA approximation)</option></select>
    <div id="manual-controls"><label for="check-bearing">True bearing (0–360°)</label><input id="check-bearing" type="number" min="0" max="360" step="any" value="0"></div>
    <div id="landmark-controls" hidden>
      <label for="check-lat">Landmark latitude</label><input id="check-lat" type="number" min="-90" max="90" step="any" placeholder="45.5">
      <label for="check-lon">Landmark longitude (west is negative)</label><input id="check-lon" type="number" min="-180" max="180" step="any" placeholder="-122.6">
      <p>Choose a clearly identifiable distant landmark on a map; nearby targets magnify GPS and map errors.</p>
    </div>
    <p id="validation-result" role="status"></p>
    <p>The Sun reference uses the selected Explore time and current location. For an outdoor check, Return to Now. Use a vertical object's shadow: the Sun bearing is opposite the shadow. Never look directly at the Sun. This approximate geometric calculation excludes refraction and is less useful near the zenith or horizon.</p>
    <p><a href="https://gml.noaa.gov/grad/solcalc/solareqns.PDF" target="_blank" rel="noopener">NOAA calculation reference</a> · <a href="https://aa.usno.navy.mil/data/AltAz" target="_blank" rel="noopener">Independent Sun/Moon position tables (USNO)</a></p>
    <p>For a Moon cross-check, enter the same coordinates and UTC time in the independent tables. Check azimuth conventions and apparent versus geometric altitude. A Sun comparison does not validate the Moon calculation.</p>
    <label for="check-note">Observation note</label><input id="check-note" maxlength="300" placeholder="e.g. bridge tower, returned after full turn">
    <button id="check-capture">Capture snapshot</button> <button id="check-download">Download snapshots</button> <button id="check-clear">Clear snapshots</button>
    <p id="check-count" role="status">No snapshots. Kept in this tab only; download before closing.</p>
    <p id="check-feedback" role="status"></p>
  `;
  panel.insertBefore(section, document.getElementById('debug-content'));
  const $ = id => document.getElementById(id), snapshots = [];
  let last = null;
  const value = id => $(id).value.trim() === '' ? NaN : Number($(id).value);
  function update() {
    const state = getState();
    const age = state.sensor?.receivedAt ? (Date.now()-state.sensor.receivedAt)/1000 : null;
    const headingUsable = state.visible && state.compass === 'active' && state.heading !== null && age !== null && age < 3 && Number.isFinite(state.sensor?.acceptedAt);
    const f = n => Number.isFinite(n) ? n.toFixed(1)+'°' : 'unavailable';
    $('validation-readings').textContent = `Phone true heading: ${f(state.heading)}${headingUsable ? '' : ' (not fresh/usable)'}\nSource: ${state.source ?? 'none'}\nMagnetic heading: ${f(state.sensor?.magnetic)}\nDeclination added: ${f(state.declination)}\nSensor alpha / beta / gamma: ${f(state.sensor?.alpha)} / ${f(state.sensor?.beta)} / ${f(state.sensor?.gamma)}\nReported compass accuracy: ${Number.isFinite(state.sensor?.accuracy) && state.sensor.accuracy >= 0 ? f(state.sensor.accuracy) : 'unavailable'}\nReading age: ${age === null ? 'none' : age.toFixed(1)+' s'}\nSelected time UTC: ${state.date.toISOString()}\nCoordinates: ${state.location ? state.location.latitude+', '+state.location.longitude : 'unavailable'}\nGPS accuracy radius: ${Number.isFinite(state.location?.accuracy) ? Math.round(state.location.accuracy)+' m' : 'unavailable'}`;
    $('manual-controls').hidden = $('check-target').value !== 'manual';
    $('landmark-controls').hidden = $('check-target').value !== 'landmark';
    let reference = null, error = null;
    try {
      if ($('check-target').value === 'manual') {
        const bearing = value('check-bearing');
        if (!Number.isFinite(bearing) || bearing<0 || bearing>360) throw Error('Enter a true bearing from 0 to 360.');
        reference = {azimuth: wrap(bearing)};
      } else {
        if (!state.location) throw Error('Location needed for this reference.');
        reference = $('check-target').value === 'sun' ? referenceSun(state.date,state.location) : landmarkBearing(state.location,{latitude:value('check-lat'),longitude:value('check-lon')});
        if (reference.azimuth === null) throw Error('Azimuth undefined near zenith.');
      }
    } catch(e) { error=e.message; }
    const difference = reference && headingUsable ? turn(reference.azimuth,state.heading) : null;
    $('validation-result').textContent = error || `Reference ${f(reference.azimuth)} true${reference.distance !== undefined ? ' · distance '+Math.round(reference.distance)+' m' : ''}${reference.altitude !== undefined ? ' · Sun altitude '+f(reference.altitude)+(reference.altitude<0 ? ' (below horizon)' : '')+(Math.abs(reference.altitude)>75 ? ' · azimuth sensitive near zenith/nadir; use a landmark instead' : '') : ''}. ${difference === null ? 'Waiting for a fresh compass reading.' : 'Turn '+Math.abs(difference).toFixed(1)+'° '+(difference<0?'left':'right')+' to reference. This is an error measurement only when physically aimed at that reference.'}`;
    last = {capturedAt:new Date().toISOString(),selectedTime:state.date.toISOString(),mode:state.mode,location:state.location,moon:state.moon,heading:state.heading,source:state.source,declination:state.declination,sensor:state.sensor,headingUsable,target:$('check-target').value,reference,error,difference,note:$('check-note').value};
  }
  section.addEventListener('input',update);
  $('check-capture').onclick = () => { update(); snapshots.push(structuredClone(last)); $('check-count').textContent = `${snapshots.length} snapshots in this tab. Download before closing. Includes coordinates.`; };
  $('check-clear').onclick = () => { snapshots.length=0; $('check-count').textContent='No snapshots. Kept in this tab only; download before closing.'; };
  $('check-download').onclick = () => {
    if (!snapshots.length) { $('check-feedback').textContent='Capture a snapshot first.'; return; }
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,snapshots},null,2)],{type:'application/json'}));
    const a=document.createElement('a'); a.href=url; a.download='moon-finder-field-checks.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('check-feedback').textContent='Snapshot download requested.';
  };
  update(); setInterval(()=>{if(!document.hidden)update();},500);
}
