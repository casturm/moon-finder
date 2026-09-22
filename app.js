const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
 
function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
}
function toCompassAzimuth(sunCalcAzimuth) {
    return sunCalcAzimuth + 180;
  
}
function toCompassDirection(degrees) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  const index = Math.round(degrees / 45) % 8;

  return directions[index];
}
function isWaxing(phase) {
  return phase < 0.5;
}
function isGibbous(fraction) {
  return fraction < 0.5 
}

const date = new Date();
// Hard coded Portland, OR coordinates
// const latitude = 45.5152;
// const longitude = -122.6784;
 
navigator.geolocation.getCurrentPosition(
  (position) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    updateMoon(date, latitude, longitude);
  },
  (error) => {
    console.error(error);
  }
);
 
function updateMoon(date, latitude, longitude) {
    const position = SunCalc.getMoonPosition(date, latitude, longitude);

    const {phase} = SunCalc.getMoonIllumination(date);
    const waxing = isWaxing(phase)
    const name = names[Math.round(phase * 8) % 8];

    const illumination = SunCalc.getMoonIllumination(date);

    const moonRadius = 150;
    const fraction = illumination.fraction;
    const gibbous = isGibbous(fraction);
    const gibbousRx = Math.abs((fraction - 0.5) * 2 * moonRadius);
    const crescentRx = moonRadius * (1 - 2 * fraction)

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

    document.getElementById('direction').textContent = whereToLook.direction;
    document.getElementById('azimuth').textContent = whereToLook.azimuth;
    document.getElementById('illumination').textContent = whereToLook.illumination;
    document.getElementById('phase').textContent = whereToLook.phase;
    document.getElementById('altitude').textContent = whereToLook.altitude;
    document.getElementById('compass-azimuth').textContent = whereToLook.compassAzimuth;
    document.getElementById('compass-direction').textContent = whereToLook.compassDirection;

    if (altitude < 0) {
        document.getElementById('altitude-descriptor').textContent = 'below horizon'
    } else {
        document.getElementById('altitude-descriptor').textContent = 'above horizon'
    }

    const moonShadow = document.getElementById('phase-shadow-group');
    if (waxing) {
        moonShadow.classList.remove('waning');
    } else {
        moonShadow.classList.add('waning');
    }

    if (gibbous) {
        document.getElementById('phase-shadow').setAttribute('href', '#crescent-shadow');
        document.getElementById('crescent-shadow-ellipse').setAttribute('rx', crescentRx);
    } else {
        document.getElementById('phase-shadow').setAttribute('href', '#gibbous-shadow');
        document.getElementById('gibbous-mask-ellipse').setAttribute('rx', gibbousRx);
    }
}
