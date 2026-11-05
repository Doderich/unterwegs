import sample from '../../../docs/samples/collection-detail.json';
import { collectionSchema } from '@/api/schemas';

import { buildCollectionView, mapData, sortCollections, collectionMediaUrls } from '../selectors';

const collection = collectionSchema.parse(sample);
const view = buildCollectionView(collection);

describe('buildCollectionView (Japan sample)', () => {
  it('uses Tokyo as the collection zone', () => {
    expect(view.timeZone).toBe('Asia/Tokyo');
  });

  it('builds 23 consecutive days starting with the departure day', () => {
    expect(view.days).toHaveLength(23);
    expect(view.days[0]).toMatchObject({ date: '2026-12-17', number: 1, name: 'Abflug Frankfurt' });
    expect(view.days.at(-1)?.date).toBe('2027-01-08');
  });

  it('resolves every itinerary item and keeps all transports', () => {
    const entries = view.days.flatMap((d) => d.entries);
    expect(entries.length).toBeGreaterThanOrEqual(40);
    const transports = new Set(
      entries.filter((e) => e.kind === 'transportation').map((e) => (e as { transport: { id: string } }).transport.id),
    );
    expect(transports.size).toBe(10);
    expect(view.days[0].entries[0]).toMatchObject({ kind: 'transportation' });
  });

  it('puts notes and checklists from the itinerary and dated ones on their day', () => {
    const note = { id: 'n1', name: 'Rail Pass abholen', content: null, date: null, links: [] };
    const checklist = { id: 'c1', name: 'Packliste', date: '2026-12-17', items: [] };
    const withNotes = buildCollectionView({
      ...collection,
      notes: [note],
      checklists: [checklist],
      itinerary: [
        ...collection.itinerary,
        { id: 'i1', content_type: 'note', object_id: 'n1', date: '2026-12-18', is_global: false, order: 99 },
      ],
    });
    expect(withNotes.days[1].entries.at(-1)).toMatchObject({ kind: 'note', note: { id: 'n1' } });
    expect(withNotes.days[0].entries.at(-1)).toMatchObject({ kind: 'checklist', checklist: { id: 'c1' } });
    expect(withNotes.days).toHaveLength(23);
  });

  it('knows where we sleep: nothing on the plane, a lodging every night in Japan', () => {
    expect(view.days[0].nightLodging).toBeNull();
    const japanNights = view.days.slice(1, -2);
    expect(japanNights.every((d) => d.nightLodging)).toBe(true);
  });

  it('lists 7 lodgings in check-in order with nights', () => {
    expect(view.lodgings).toHaveLength(7);
    const checkIns = view.lodgings.map((s) => s.checkInDate!);
    expect([...checkIns].sort()).toEqual(checkIns);
    expect(view.lodgings.reduce((n, s) => n + s.nights, 0)).toBeGreaterThan(15);
  });

  it('builds map points and lines from coordinates', () => {
    const { points, lines } = mapData(view);
    expect(points.filter((p) => p.kind === 'location')).toHaveLength(21);
    expect(points.filter((p) => p.kind === 'lodging')).toHaveLength(7);
    expect(lines).toHaveLength(10);
  });

  it('collects all media for offline use', () => {
    const media = collectionMediaUrls(collection);
    expect(media.images).toHaveLength(28);
    expect(media.attachments).toHaveLength(8);
  });

  it('keeps GPX tracks of activities offline like attachments', () => {
    const gpx = 'https://adventurelog.example.org/media/activities/hike.gpx';
    const withTrack = {
      ...collection,
      locations: collection.locations.map((l, i) =>
        i === 0
          ? {
              ...l,
              visits: [
                {
                  id: 'v',
                  activities: [
                    { id: 'a', name: 'Hike', gpx_file: gpx },
                    { id: 'b', name: 'Walk' },
                  ],
                },
              ],
            }
          : l,
      ),
    };
    expect(collectionMediaUrls(withTrack).attachments).toContain(gpx);
    expect(collectionMediaUrls(withTrack).attachments).toHaveLength(9);
  });
});

it('sorts collections: current, upcoming (soonest first), past (latest first), archived hidden', () => {
  const t = (id: string, start: string, end: string, archived = false) => ({
    id,
    name: id,
    start_date: start,
    end_date: end,
    is_archived: archived,
  });
  const sorted = sortCollections(
    [
      t('past-old', '2025-01-01', '2025-01-05'),
      t('later', '2027-05-01', '2027-05-10'),
      t('japan', '2026-12-17', '2027-01-08'),
      t('past-new', '2026-06-01', '2026-06-10'),
      t('archived', '2026-12-01', '2027-02-01', true),
    ],
    '2026-12-20',
  );
  expect(sorted.map((x) => x.id)).toEqual(['japan', 'later', 'past-new', 'past-old']);
});

describe('new collections and unscheduled items', () => {
  const { buildCollectionView, dateRange, isOwner, unscheduled } = jest.requireActual('../selectors');
  const sample = jest.requireActual('../../../docs/samples/collection-detail.json');
  const { collectionSchema } = jest.requireActual('@/api/schemas');
  const base = collectionSchema.parse(sample);

  it('has a day for every date of the collection even before anything is planned', () => {
    const empty = {
      ...base,
      itinerary: [],
      itinerary_days: [],
      notes: [],
      checklists: [],
      transportations: [],
      lodging: [],
      locations: [],
      start_date: '2027-03-26',
      end_date: '2027-03-30',
    };
    const view = buildCollectionView(empty);
    expect(view.days.map((d: { date: string }) => d.date)).toEqual([
      '2027-03-26',
      '2027-03-27',
      '2027-03-28',
      '2027-03-29',
      '2027-03-30',
    ]);
  });

  it('builds date ranges across month and year ends', () => {
    expect(dateRange('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    expect(dateRange('2027-01-02', '2026-12-30')).toEqual([]);
    expect(dateRange(null, '2027-01-02')).toEqual([]);
  });

  it('keeps the sample collection at its 23 days', () => {
    expect(buildCollectionView(base).days).toHaveLength(23);
  });

  it('lists a location that is on no day, and drops it once it is planned', () => {
    const loc = { ...base.locations[0], id: 'unplanned-loc', name: 'Neu' };
    const withLoc = { ...base, locations: [...base.locations, loc] };
    expect(unscheduled(buildCollectionView(withLoc)).map((u: { id: string }) => u.id)).toContain('unplanned-loc');
    const planned = {
      ...withLoc,
      itinerary: [
        ...withLoc.itinerary,
        {
          id: 'it-x',
          content_type: 'location',
          object_id: 'unplanned-loc',
          date: base.start_date,
          order: 0,
          is_global: false,
        },
      ],
    };
    expect(unscheduled(buildCollectionView(planned)).map((u: { id: string }) => u.id)).not.toContain('unplanned-loc');
  });

  it('knows the owner from the collaborators list', () => {
    expect(
      isOwner({ ...base, collaborators: [{ uuid: 'a', username: 'a', is_owner: true, is_current_user: true }] }),
    ).toBe(true);
    expect(
      isOwner({ ...base, collaborators: [{ uuid: 'a', username: 'a', is_owner: true, is_current_user: false }] }),
    ).toBe(false);
  });
});

describe('form helpers', () => {
  const { changedFields, nearestZone } = jest.requireActual('../selectors');
  const sample = jest.requireActual('../../../docs/samples/collection-detail.json');
  const { collectionSchema } = jest.requireActual('@/api/schemas');
  const c = collectionSchema.parse(sample);

  it('finds the zone of a nearby lodging, none far away', () => {
    const l = c.lodging[0];
    expect(nearestZone(c, l.latitude + 0.05, l.longitude + 0.05)).toBe(l.timezone);
    expect(nearestZone(c, -33.9, 18.4)).toBeNull();
  });

  it('only reports fields that changed, treating "120.00" and 120 as equal', () => {
    expect(
      changedFields(
        { name: 'A', price: '120.00', link: null, timezone: 'Asia/Tokyo' },
        { name: 'A', price: '120', link: '', timezone: 'Asia/Tokyo' },
      ),
    ).toEqual({ link: '' });
    expect(changedFields({ name: 'A' }, { name: 'B' })).toEqual({ name: 'B' });
  });

  it('gives a location the zone of its visit, nearby lodging, its country, else the collection', () => {
    const { locationZone, buildCollectionView } = jest.requireActual('../selectors');
    const empty = { ...c, lodging: [], transportations: [] };
    const view = buildCollectionView(empty, '2026-11-04');
    const kyoto = {
      ...c.locations[0],
      latitude: 35.04,
      longitude: 135.73,
      visits: [],
      country: { country_code: 'JP' },
    };
    expect(locationZone({ ...view, timeZone: 'Europe/Berlin' }, kyoto)).toBe('Asia/Tokyo');
    expect(locationZone({ ...view, timeZone: 'Europe/Berlin' }, { ...kyoto, country: null })).toBe('Europe/Berlin');
    const visited = { ...kyoto, visits: [{ id: 'v', timezone: 'Asia/Seoul', activities: [] }] };
    expect(locationZone(view, visited)).toBe('Asia/Seoul');
  });

  it('knows whether the signed-in user belongs to a collection', () => {
    const { isMember } = jest.requireActual('../selectors');
    expect(isMember(c)).toBe(true);
    const foreign = { ...c, collaborators: c.collaborators.map((x: object) => ({ ...x, is_current_user: false })) };
    expect(isMember(foreign)).toBe(false);
    expect(isMember({ ...c, collaborators: [] })).toBe(true);
  });

  it('compares lists by their items', () => {
    expect(changedFields({ tags: ['a', 'b'] }, { tags: ['a', 'b'] })).toEqual({});
    expect(changedFields({ tags: ['a', 'b'] }, { tags: ['b', 'a'] })).toEqual({ tags: ['b', 'a'] });
    expect(changedFields({ tags: null }, { tags: [] })).toEqual({});
    expect(changedFields({ tags: ['a'] }, { tags: [] })).toEqual({ tags: [] });
  });
});
