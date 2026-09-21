function radiansToDegrees(radians) {
    return radians * 180 / Math.PI
}
function toCompassAzimuth(sunCalcAzimuth) {
    return sunCalcAzimuth + 180
  
}
function toCompassDirection(degrees) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  const index = Math.round(degrees / 45) % 8;

  return directions[index];
}
const date = new Date()
const latitude = 45.5152;
const longitude = -122.6784;
const position = SunCalc.getMoonPosition(date, latitude, longitude)
console.log(position)
const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
               'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
const {phase} = SunCalc.getMoonIllumination(date);
const illumination = SunCalc.getMoonIllumination(date);
console.log(illumination)
const name = names[Math.round(phase * 8) % 8];
const compassToAzimuth = toCompassAzimuth(radiansToDegrees(position.azimuth));
const compassDirection = toCompassDirection(compassToAzimuth);
const altitude = radiansToDegrees(position.altitude);
const whereToLook = {
    direction: compassDirection,
    azimuth: Math.round(compassToAzimuth),
    phase: name,
    illumination: Math.round(illumination.fraction * 100),
    altitude: Math.round(altitude),
    compassAzimuth: Math.round(compassToAzimuth)
}
console.log(whereToLook)
//const output = {
//    position: position,
//    illumination: illumination,
//    whereToLook: whereToLook
//}
//document.getElementById('output').textContent = JSON.stringify(output, null, 2)
document.getElementById('direction').textContent =
  whereToLook.direction;
document.getElementById('azimuth').textContent =
  whereToLook.azimuth;
document.getElementById('illumination').textContent =
  whereToLook.illumination;
document.getElementById('phase').textContent =
  whereToLook.phase;
document.getElementById('altitude').textContent =
  whereToLook.altitude;
document.getElementById('compass-azimuth').textContent =
  whereToLook.compassAzimuth;
document.getElementById('compass-direction').textContent =
  whereToLook.compassDirection;

const moonRadius = 150;
const fraction = illumination.fraction;
const shadowRx = (fraction - 0.5) * 2 * moonRadius;

console.log(shadowRx)

document
  .getElementById('phase-ellipse')
  .setAttribute('rx', shadowRx);
