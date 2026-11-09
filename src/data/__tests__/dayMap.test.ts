import { dayColor, dayMapPoints, type DayMapDay } from '../dayMap';
import type { MapPoint } from '../selectors';

const point = (id: string, kind: MapPoint['kind'], dates: string[]): MapPoint => ({
  key: `${kind}-${id}`,
  kind,
  id,
  title: id,
  subtitle: null,
  latitude: 0,
  longitude: 0,
  dates,
});

const days: DayMapDay[] = [
  { date: '2027-02-01', number: 1, nightLodgingId: 'hotel-a' },
  { date: '2027-02-02', number: 2, nightLodgingId: 'hotel-a' },
  { date: '2027-02-03', number: 3, nightLodgingId: 'hotel-b' },
];

const points = [
  point('castle', 'location', ['2027-02-02']),
  point('tower', 'location', ['2027-02-03', '2027-02-01']),
  point('cafe', 'location', []),
  point('hotel-a', 'lodging', ['2027-02-01', '2027-02-02']),
  point('hotel-b', 'lodging', ['2027-02-03']),
  point('train', 'transport-start', ['2027-02-03']),
];

const roles = (selected: string) =>
  Object.fromEntries(dayMapPoints(points, days, selected).map((p) => [p.id + ':' + p.kind, [p.role, p.dayNumber]]));

it('gives every point of the whole collection its first day, and places on no day none', () => {
  expect(roles('all')).toEqual({
    'castle:location': ['planned', 2],
    'tower:location': ['planned', 1],
    'cafe:location': ['open', null],
    'hotel-a:lodging': ['planned', 1],
    'hotel-b:lodging': ['planned', 3],
    'train:transport-start': ['planned', 3],
  });
});

it('shows one day with the stays it starts and ends at, and the places still open', () => {
  expect(roles('2027-02-03')).toEqual({
    'tower:location': ['planned', 3],
    'cafe:location': ['open', null],
    'hotel-a:lodging': ['start', 3],
    'hotel-b:lodging': ['tonight', 3],
    'train:transport-start': ['planned', 3],
  });
});

it('keeps a stay that is last night and tonight as tonight', () => {
  expect(roles('2027-02-02')['hotel-a:lodging']).toEqual(['tonight', 2]);
  expect(roles('2027-02-02')['castle:location']).toEqual(['planned', 2]);
  expect(roles('2027-02-02')['tower:location']).toBeUndefined();
});

it('shows nothing for a day the collection does not have', () => {
  expect(dayMapPoints(points, days, '2030-01-01')).toEqual([]);
});

it('steps through eight day colours in a fixed order, per appearance', () => {
  expect(dayColor(1, false)).toBe('#2a78d6');
  expect(dayColor(2, false)).not.toBe(dayColor(1, false));
  expect(dayColor(9, false)).toBe(dayColor(1, false));
  expect(dayColor(1, true)).toBe('#3987e5');
});
