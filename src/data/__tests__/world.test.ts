import {
  citySchema,
  countrySchema,
  dashboardSchema,
  pinSchema,
  regionSchema,
  visitedCitySchema,
  visitedRegionSchema,
} from '@/api/schemas';
import { setLanguage } from '@/i18n';

import {
  cityRows,
  countrySections,
  flagEmoji,
  percent,
  pinBounds,
  placedPins,
  regionRows,
  withCityVisit,
  withCountryVisits,
  withoutCityVisit,
  withoutRegionVisit,
  withRegionVisit,
} from '../world';

// Shapes as returned by v0.13.1 (SERVER.md → World); values are public reference data or made up.
const countries = [
  { id: 109, name: 'Japan', country_code: 'JP', subregion: 'Eastern Asia', num_regions: 47, num_visits: 2 },
  { id: 82, name: 'Germany', country_code: 'DE', subregion: 'Western Europe', num_regions: 16, num_visits: 0 },
  { id: 1, name: 'Afghanistan', country_code: 'AF', subregion: 'Southern Asia', num_regions: 34, num_visits: 0 },
].map((c) =>
  countrySchema.parse({ ...c, capital: null, latitude: 0, longitude: 0, flag_url: 'https://example.org/f.png' }),
);

const regions = [
  { id: 'JP-23', name: 'Aichi', num_cities: 70, country_name: 'Japan', country: 109, latitude: 35, longitude: 137 },
  { id: 'JP-13', name: 'Tokyo', num_cities: 62, country_name: 'Japan', country: 109, latitude: 35.6, longitude: 139.7 },
].map((r) => regionSchema.parse(r));

const visit = visitedRegionSchema.parse({
  id: 1,
  user: 'u',
  region: 'JP-13',
  name: 'Tokyo',
  latitude: 1,
  longitude: 2,
});

// `GET /api/regions/{id}/cities` and `…/cities/visits` (worldtravel serializers, v0.13.1).
const cities = [
  {
    id: 'JP-13-shinjuku',
    name: 'Shinjuku',
    region: 'JP-13',
    region_name: 'Tokyo',
    country_name: 'Japan',
    latitude: 35.69,
    longitude: 139.7,
  },
  {
    id: 'JP-13-asakusa',
    name: 'Asakusa',
    region: 'JP-13',
    region_name: 'Tokyo',
    country_name: 'Japan',
    latitude: null,
    longitude: null,
  },
].map((c) => citySchema.parse(c));
const cityVisit = visitedCitySchema.parse({
  id: 7,
  user: 'u',
  city: 'JP-13-shinjuku',
  name: 'Shinjuku',
  latitude: 1,
  longitude: 2,
});

afterEach(() => setLanguage('de'));

describe('schemas', () => {
  it('reads the dashboard stats and ignores the rest', () => {
    const d = dashboardSchema.parse({
      stats: { location_count: 21, visited_region_count: '3', total_regions: 5325, activities_overall: {} },
      recent_locations: [],
      upcoming_trips: [],
    });
    expect(d.stats).toMatchObject({ location_count: 21, visited_region_count: 3, total_regions: 5325, trips_count: 0 });
  });

  it('reads pins with and without coordinates', () => {
    const pins = [
      { id: 'a', name: 'Tempel', latitude: 35, longitude: 135, is_visited: true, category: null },
      { id: 'b', name: 'Ohne Ort', latitude: null, longitude: null, is_visited: false },
    ].map((p) => pinSchema.parse(p));
    expect(placedPins(pins).map((p) => p.id)).toEqual(['a']);
  });
});

describe('flagEmoji', () => {
  it('turns country codes into flags', () => {
    expect(flagEmoji('JP')).toBe('🇯🇵');
    expect(flagEmoji('de')).toBe('🇩🇪');
    expect(flagEmoji('XKX')).toBe('🏳️');
  });
});

describe('countrySections', () => {
  it('puts visited countries first and sorts by the displayed name', () => {
    const { visited, other } = countrySections(countries);
    expect(visited.map((c) => c.country_code)).toEqual(['JP']);
    expect(other.map((c) => c.country_code)).toEqual(['AF', 'DE']);
  });

  it('searches the displayed name, the English name and the code', () => {
    expect(countrySections(countries, 'germ').other.map((c) => c.country_code)).toEqual(['DE']);
    expect(countrySections(countries, 'jp').visited.map((c) => c.country_code)).toEqual(['JP']);
    expect(countrySections(countries, 'xyz')).toEqual({ visited: [], other: [] });
  });
});

describe('region visits', () => {
  it('merges visits into alphabetical region rows', () => {
    expect(regionRows(regions, [visit]).map((r) => [r.id, r.visited])).toEqual([
      ['JP-23', false],
      ['JP-13', true],
    ]);
  });

  it('adds and removes a visit optimistically, without duplicates', () => {
    const added = withRegionVisit([], regions[0]);
    expect(added).toEqual([{ id: -1, region: 'JP-23', name: 'Aichi' }]);
    expect(withRegionVisit(added, regions[0])).toBe(added);
    expect(withoutRegionVisit([visit, ...added], 'JP-13')).toEqual(added);
  });

  it('keeps the country count in step and never below zero', () => {
    expect(withCountryVisits(countries, 'JP', 1).find((c) => c.country_code === 'JP')?.num_visits).toBe(3);
    expect(withCountryVisits(countries, 'DE', -1).find((c) => c.country_code === 'DE')?.num_visits).toBe(0);
  });
});

describe('city visits', () => {
  it('merges visits into alphabetical city rows', () => {
    expect(cityRows(cities, [cityVisit]).map((c) => [c.name, c.visited])).toEqual([
      ['Asakusa', false],
      ['Shinjuku', true],
    ]);
  });

  it('adds and removes a visit optimistically, without duplicates', () => {
    const added = withCityVisit([], cities[1]);
    expect(added).toEqual([{ id: -1, city: 'JP-13-asakusa', name: 'Asakusa' }]);
    expect(withCityVisit(added, cities[1])).toBe(added);
    expect(withoutCityVisit([cityVisit, ...added], 'JP-13-shinjuku')).toEqual(added);
  });
});

describe('numbers and map', () => {
  it('rounds percentages and handles empty totals', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });

  it('fits all pins and pads a single one', () => {
    const pins = placedPins([
      { id: 'a', name: 'A', latitude: 35, longitude: 135 },
      { id: 'b', name: 'B', latitude: 50, longitude: 8 },
    ]);
    expect(pinBounds(pins)).toEqual([8, 35, 135, 50]);
    expect(pinBounds(pins.slice(0, 1))).toEqual([134.98, 34.98, 135.02, 35.02]);
    expect(pinBounds([])).toBeNull();
  });
});
