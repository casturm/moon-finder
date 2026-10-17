export const normalizeDegrees = (value) => ((value % 360) + 360) % 360;
export const shortestTurn = (target, heading) =>
  normalizeDegrees(target - heading + 180) - 180;
// SunCalc 1.9 gives an anticlockwise angle from zenith; SVG rotates clockwise from right.
export const brightLimbRotation = (angle, parallacticAngle) =>
  -90 - ((angle - parallacticAngle) * 180) / Math.PI;
export function validDate(date) {
  return (
    Number.isFinite(date.getTime()) &&
    date.getFullYear() >= 1900 &&
    date.getFullYear() <= 2100
  );
}
export function stepCalendarDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
export function calculateMoon(suncalc, date, location) {
  const illumination = suncalc.getMoonIllumination(date);
  const names = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
  ];
  const result = {
    ...illumination,
    name: names[Math.round(illumination.phase * 8) % 8],
  };
  if (location) {
    const position = suncalc.getMoonPosition(
      date,
      location.latitude,
      location.longitude,
    );
    result.azimuth = normalizeDegrees((position.azimuth * 180) / Math.PI + 180);
    result.altitude = (position.altitude * 180) / Math.PI;
    result.rotation = brightLimbRotation(
      illumination.angle,
      position.parallacticAngle,
    );
    result.parallacticAngle = position.parallacticAngle;
    result.direction = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
      Math.round(result.azimuth / 45) % 8
    ];
  }
  return result;
}
