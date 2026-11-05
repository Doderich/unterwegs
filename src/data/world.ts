import type { City, Country, Pin, Region, VisitedCity, VisitedRegion } from '@/api/schemas';
import { locale } from '@/i18n';

/** `JP` → 🇯🇵 (regional indicator letters). Works offline, unlike the server's flag images. */
export function flagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '🏳️';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Country names in the app language when `Intl` knows the code; the server sends English names. */
export function countryName(country: Pick<Country, 'country_code' | 'name'>): string {
  try {
    const names = new Intl.DisplayNames([locale()], { type: 'region' });
    const name = names.of(country.country_code.toUpperCase());
    return name && name !== country.country_code.toUpperCase() ? name : country.name;
  } catch {
    return country.name;
  }
}

const byName = <T>(name: (x: T) => string) => {
  const collator = new Intl.Collator(locale());
  return (a: T, b: T) => collator.compare(name(a), name(b));
};

/** Countries with visited regions first, then all others; both alphabetical in the app language. */
export function countrySections(countries: Country[], query = '') {
  const q = query.trim().toLocaleLowerCase();
  const named = countries
    .map((c) => ({ ...c, displayName: countryName(c) }))
    .filter(
      (c) =>
        !q ||
        c.displayName.toLocaleLowerCase().includes(q) ||
        c.name.toLocaleLowerCase().includes(q) ||
        c.country_code.toLocaleLowerCase() === q,
    )
    .sort(byName((c) => c.displayName));
  return {
    visited: named.filter((c) => c.num_visits > 0),
    other: named.filter((c) => c.num_visits === 0),
  };
}

export type RegionRow = Region & { visited: boolean };

/** Regions of one country, alphabetical, with the user's visits merged in. */
export function regionRows(regions: Region[], visits: VisitedRegion[]): RegionRow[] {
  const visited = new Set(visits.map((v) => v.region));
  return regions.map((r) => ({ ...r, visited: visited.has(r.id) })).sort(byName((r) => r.name));
}

/** Optimistic list after marking a region; the temporary id is replaced by the refetch. */
export function withRegionVisit(visits: VisitedRegion[], region: Region): VisitedRegion[] {
  if (visits.some((v) => v.region === region.id)) return visits;
  return [...visits, { id: -1, region: region.id, name: region.name }];
}

export function withoutRegionVisit(visits: VisitedRegion[], regionId: string): VisitedRegion[] {
  return visits.filter((v) => v.region !== regionId);
}

export type CityRow = City & { visited: boolean };

/** Cities of one region, alphabetical, with the user's visits merged in. */
export function cityRows(cities: City[], visits: VisitedCity[]): CityRow[] {
  const visited = new Set(visits.map((v) => v.city));
  return cities.map((c) => ({ ...c, visited: visited.has(c.id) })).sort(byName((c) => c.name));
}

export function withCityVisit(visits: VisitedCity[], city: City): VisitedCity[] {
  if (visits.some((v) => v.city === city.id)) return visits;
  return [...visits, { id: -1, city: city.id, name: city.name }];
}

export function withoutCityVisit(visits: VisitedCity[], cityId: string): VisitedCity[] {
  return visits.filter((v) => v.city !== cityId);
}

/** `country.num_visits` follows the marked regions. */
export function withCountryVisits(countries: Country[], countryCode: string, delta: number): Country[] {
  return countries.map((c) =>
    c.country_code === countryCode ? { ...c, num_visits: Math.max(0, c.num_visits + delta) } : c,
  );
}

/** `3 / 47` share as a whole percentage, 0 when there is nothing to count. */
export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export type PlacedPin = Pin & { latitude: number; longitude: number };

export function placedPins(pins: Pin[]): PlacedPin[] {
  return pins.filter((p): p is PlacedPin => typeof p.latitude === 'number' && typeof p.longitude === 'number');
}

/** [west, south, east, north] around all pins, padded for a single pin; null without pins. */
export function pinBounds(pins: { latitude: number; longitude: number }[]): [number, number, number, number] | null {
  if (pins.length === 0) return null;
  const lngs = pins.map((p) => p.longitude);
  const lats = pins.map((p) => p.latitude);
  const pad = pins.length === 1 ? 0.02 : 0;
  return [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad];
}
