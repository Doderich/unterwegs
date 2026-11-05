import tzLookup from '@photostructure/tz-lookup';

import { SERVER_ZONES } from './zones';
import { COUNTRY_ZONES } from './countryZones';

/**
 * The time zone of a place from its country (as the server stores it on a location) and coordinates: the only zone
 * of the country, else the one with the nearest reference point. Null when the country is unknown.
 */
export function zoneForPlace(
  countryCode: string | null | undefined,
  latitude: number,
  longitude: number,
): string | null {
  const zones = countryCode ? COUNTRY_ZONES[countryCode.toUpperCase()] : undefined;
  if (!zones?.length) return null;
  if (zones.length === 1) return zones[0][0];
  let best = zones[0];
  let bestKm = Infinity;
  for (const z of zones) {
    const km = distanceKm(latitude, longitude, z[1], z[2]);
    if (km < bestKm) [best, bestKm] = [z, km];
  }
  return best[0];
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** Offline coordinate lookup. An estimate near borders; only suggest zones accepted by the pinned server. */
export function suggestedZone(latitude: number, longitude: number): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  try {
    const zone = tzLookup(latitude, longitude);
    return SERVER_ZONES.includes(zone) ? zone : null;
  } catch {
    return null;
  }
}
