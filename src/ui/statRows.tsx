import type { Stats } from '@/api/schemas';
import { percent } from '@/data/world';
import { tr } from '@/i18n';

import { infoRow, type RowTheme } from './rows';

/** Counts of locations, collections, countries, regions and cities (own world screen and public profiles). */
export function statRows(rt: RowTheme, s: Stats) {
  const share = (n: number, total: number) => tr('statRows.nOfTotalP', { n, total, p: percent(n, total) });
  return [
    infoRow(rt, {
      key: 'locations',
      icon: 'location',
      label: tr('statRows.locationsNVisited', { n: s.visited_location_count }),
      value: String(s.location_count),
    }),
    infoRow(rt, { key: 'trips', icon: 'luggage', label: tr('common.trips'), value: String(s.trips_count) }),
    infoRow(rt, {
      key: 'countries',
      icon: 'world',
      label: tr('common.countries'),
      value: share(s.visited_country_count, s.total_countries),
    }),
    infoRow(rt, {
      key: 'regions',
      icon: 'flag',
      label: tr('statRows.regions'),
      value: share(s.visited_region_count, s.total_regions),
    }),
    infoRow(rt, {
      key: 'cities',
      icon: 'pin',
      label: tr('statRows.cities'),
      value: share(s.visited_city_count, s.total_cities),
    }),
  ];
}
