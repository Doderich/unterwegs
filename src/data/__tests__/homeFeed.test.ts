import { collectionSummarySchema, locationSchema } from '@/api/schemas';
import { homeFeed } from '../homeFeed';

const now = new Date('2027-03-01T23:30:00Z');
const collection = (id: string, start: string, end: string) =>
  collectionSummarySchema.parse({ id, name: id, start_date: start, end_date: end });
const place = (id: string, start?: string, end?: string, timezone = 'Asia/Tokyo') =>
  locationSchema.parse({
    id,
    name: id,
    created_at: '2027-02-01T00:00:00Z',
    visits: start ? [{ id: `visit-${id}`, start_date: start, end_date: end ?? start, timezone }] : [],
  });

it('mixes upcoming collections and standalone visits in date order, leaving undated places out of the schedule', () => {
  const feed = homeFeed(
    [collection('later', '2027-03-05', '2027-03-09')],
    [place('first', '2027-03-03T03:00:00Z'), place('saved')],
    now,
  );
  expect(feed.upcoming.map((x) => x.kind)).toEqual(['visit', 'collection']);
  expect(feed.recent).toHaveLength(2);
});
it('uses a timed visit’s own zone across the date line', () => {
  const feed = homeFeed([], [place('tokyo', '2027-03-01T23:00:00Z', '2027-03-02T01:00:00Z')], now);
  expect(feed.current[0]).toMatchObject({ kind: 'visit', date: '2027-03-02' });
});
it('preserves midnight-UTC all-day dates instead of shifting them to the previous local day', () => {
  const feed = homeFeed([], [place('california', '2027-03-02T00:00:00Z', undefined, 'America/Los_Angeles')], now);
  expect(feed.upcoming[0]).toMatchObject({ date: '2027-03-02' });
});
it('keeps multi-day visits active and removes old visits and archived collections', () => {
  const old = place('old', '2027-02-01T00:00:00Z');
  const active = place('active', '2027-02-28T01:00:00Z', '2027-03-03T01:00:00Z');
  const archived = { ...collection('archived', '2027-03-04', '2027-03-05'), is_archived: true };
  expect(homeFeed([archived], [old, active], now).current.map((x) => x.key)).toEqual(['visit:visit-active']);
  expect(homeFeed([archived], [old], now).upcoming).toEqual([]);
});
it('deduplicates visits linked through more than one collection', () => {
  const item = place('same', '2027-03-05T00:00:00Z');
  expect(homeFeed([], [item, item], now).upcoming).toHaveLength(1);
});

it('uses a cached collection’s own zone at midnight rather than the phone date', () => {
  const c = collection('tokyo', '2027-03-02', '2027-03-03');
  expect(homeFeed([c], [], now, new Map([['tokyo', 'Asia/Tokyo']])).current[0]).toMatchObject({ kind: 'collection' });
});

it('orders visits on the same day by their displayed local time', () => {
  const later = place('a-later', '2027-03-05T06:00:00Z', '2027-03-05T07:00:00Z');
  const earlier = place('z-earlier', '2027-03-05T01:00:00Z', '2027-03-05T02:00:00Z');
  expect(homeFeed([], [later, earlier], now).upcoming.map((x) => x.key)).toEqual([
    'visit:visit-z-earlier',
    'visit:visit-a-later',
  ]);
});
