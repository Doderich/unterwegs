/**
 * Sunrise and sunset computed on the device (the sunrise equation, about a minute off at most), so they work
 * offline. The website asks an outside service through `/api/sunrise-sunset/lookup` instead.
 */
export type SunTimes =
  { kind: 'normal'; sunrise: string; sunset: string } | { kind: 'midnight-sun' } | { kind: 'polar-night' };

const rad = Math.PI / 180;
const J2000 = 2451545;
const UNIX_EPOCH_JD = 2440587.5;

/** Sunrise and sunset (UTC ISO) of the local calendar `date` (`YYYY-MM-DD`) at a place; longitude east positive. */
export function sunTimes(date: string, latitude: number, longitude: number): SunTimes {
  const [y, m, d] = date.split('-').map(Number);
  // Days since J2000 at 12:00 UTC of the date, then shifted to the mean solar noon at the place.
  const n = Date.UTC(y, m - 1, d, 12) / 86_400_000 + UNIX_EPOCH_JD - J2000;
  const meanNoon = n - longitude / 360;
  const anomaly = (357.5291 + 0.98560028 * meanNoon) % 360;
  const center =
    1.9148 * Math.sin(anomaly * rad) + 0.02 * Math.sin(2 * anomaly * rad) + 0.0003 * Math.sin(3 * anomaly * rad);
  const eclipticLongitude = (anomaly + center + 180 + 102.9372) % 360;
  const transit = J2000 + meanNoon + 0.0053 * Math.sin(anomaly * rad) - 0.0069 * Math.sin(2 * eclipticLongitude * rad);
  const declination = Math.asin(Math.sin(eclipticLongitude * rad) * Math.sin(23.4397 * rad));
  // −0.833°: refraction plus the sun's radius, as in published sunrise tables.
  const cosHourAngle =
    (Math.sin(-0.833 * rad) - Math.sin(latitude * rad) * Math.sin(declination)) /
    (Math.cos(latitude * rad) * Math.cos(declination));
  if (cosHourAngle > 1) return { kind: 'polar-night' };
  if (cosHourAngle < -1) return { kind: 'midnight-sun' };
  const halfDay = Math.acos(cosHourAngle) / rad / 360;
  const iso = (jd: number) => new Date(Math.round((jd - UNIX_EPOCH_JD) * 86_400_000)).toISOString();
  return { kind: 'normal', sunrise: iso(transit - halfDay), sunset: iso(transit + halfDay) };
}
