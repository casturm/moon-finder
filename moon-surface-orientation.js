// Low-order Moon coordinates consistent with SunCalc 1.9, and a fixed IAU pole.
// This rotates lunar north with the sky; it does not model precise libration.
export function surfaceRotation(date, parallacticAngle = 0) {
  const rad = Math.PI / 180;
  const days = date.getTime() / 86400000 - 10957.5;
  const meanLongitude = (218.316 + 13.176396 * days) * rad;
  const anomaly = (134.963 + 13.064993 * days) * rad;
  const argument = (93.272 + 13.22935 * days) * rad;
  const longitude = meanLongitude + 6.289 * rad * Math.sin(anomaly);
  const latitude = 5.128 * rad * Math.sin(argument);
  const obliquity = 23.4397 * rad;
  const ra = Math.atan2(
    Math.sin(longitude) * Math.cos(obliquity) -
      Math.tan(latitude) * Math.sin(obliquity),
    Math.cos(longitude),
  );
  const dec = Math.asin(
    Math.sin(latitude) * Math.cos(obliquity) +
      Math.cos(latitude) * Math.sin(obliquity) * Math.sin(longitude),
  );
  const poleRA = 269.9949 * rad,
    poleDec = 66.5392 * rad;
  const positionAngle = Math.atan2(
    Math.cos(poleDec) * Math.sin(poleRA - ra),
    Math.sin(poleDec) * Math.cos(dec) -
      Math.cos(poleDec) * Math.sin(dec) * Math.cos(poleRA - ra),
  );
  return -(positionAngle - parallacticAngle) / rad;
}
