// References independent of SunCalc and device sensors. Bearings: clockwise from true north.
const rad = Math.PI / 180;
export const wrap = x => ((x % 360) + 360) % 360;
export const turn = (target, heading) => wrap(target - heading + 180) - 180;
export function landmarkBearing(from, to) {
  for (const p of [from, to]) {
    if (!p || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) ||
        Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180) throw Error('Enter valid coordinates.');
  }
  const a = from.latitude * rad, b = to.latitude * rad;
  const d = (to.longitude - from.longitude) * rad;
  const x = Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(d);
  const y = Math.sin(d) * Math.cos(b);
  if (Math.hypot(x, y) < 1e-12) throw Error('Bearing undefined for identical or antipodal points.');
  const h = Math.sin((b-a)/2)**2 + Math.cos(a)*Math.cos(b)*Math.sin(d/2)**2;
  return { azimuth: wrap(Math.atan2(y,x)/rad), distance: 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1,h))) };
}
// NOAA General Solar Position Calculations, fractional-year approximation.
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
// Geometric solar center (no refraction). Diagnostic estimate, not a precision ephemeris.
export function referenceSun(date, location) {
  if (!Number.isFinite(date.getTime())) throw Error('Invalid time.');
  const year = date.getUTCFullYear(), start = Date.UTC(year,0,1);
  const days = (Date.UTC(year+1,0,1)-start)/86400000;
  const elapsed = (date.getTime()-start)/86400000;
  const g = 2*Math.PI/days*(elapsed-.5);
  const eq = 229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const dec = .006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const minutes = date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60;
  const hour = (wrap((minutes+eq+4*location.longitude)/4)-180)*rad;
  const lat = location.latitude*rad;
  const east = -Math.cos(dec)*Math.sin(hour);
  const north = Math.cos(lat)*Math.sin(dec)-Math.sin(lat)*Math.cos(dec)*Math.cos(hour);
  const up = Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(hour);
  return {azimuth: Math.hypot(east,north)<1e-8 ? null : wrap(Math.atan2(east,north)/rad), altitude: Math.asin(Math.max(-1,Math.min(1,up)))/rad};
}
