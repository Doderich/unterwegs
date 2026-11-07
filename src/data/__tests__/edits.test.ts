import sample from '../../../docs/samples/collection-detail.json';
import { collectionSchema } from '@/api/schemas';

import {
  moveWithinDay,
  withCollectionFields,
  withImage,
  withLodging,
  withOrder,
  withoutObject,
  withPrimaryImage,
} from '../edits';
import { buildCollectionView } from '../selectors';

const collection = collectionSchema.parse(sample);
const view = buildCollectionView(collection);
const busyDay = view.days.find((d) => d.entries.filter((e) => e.itineraryId).length >= 3)!;
const ids = busyDay.entries.flatMap((e) => (e.itineraryId ? [e.itineraryId] : []));

describe('moveWithinDay', () => {
  it('swaps with the neighbour and renumbers the whole day', () => {
    const updates = moveWithinDay(busyDay, ids[1], -1)!;
    expect(updates.map((u) => u.id)).toEqual([ids[1], ids[0], ...ids.slice(2)]);
    expect(updates.map((u) => u.order)).toEqual(ids.map((_, i) => i));
    expect(updates.every((u) => u.date === busyDay.date)).toBe(true);
  });

  it('returns null at the edges and for unknown ids', () => {
    expect(moveWithinDay(busyDay, ids[0], -1)).toBeNull();
    expect(moveWithinDay(busyDay, ids.at(-1)!, 1)).toBeNull();
    expect(moveWithinDay(busyDay, 'nope', 1)).toBeNull();
  });

  it('reorders the rebuilt day when applied', () => {
    const moved = buildCollectionView(withOrder(collection, moveWithinDay(busyDay, ids[0], 1)!));
    const day = moved.days.find((d) => d.date === busyDay.date)!;
    expect(day.entries.flatMap((e) => (e.itineraryId ? [e.itineraryId] : [])).slice(0, 2)).toEqual([ids[1], ids[0]]);
  });
});

describe('withoutObject', () => {
  it('drops the note and its itinerary items', () => {
    const t = {
      ...collection,
      notes: [{ id: 'n1', name: 'X', content: null, date: null, links: [] }],
      itinerary: [
        ...collection.itinerary,
        { id: 'i1', content_type: 'note', object_id: 'n1', date: busyDay.date, is_global: false, order: 9 },
      ],
    };
    const out = withoutObject(t, 'n1');
    expect(out.notes).toHaveLength(0);
    expect(out.itinerary).toHaveLength(collection.itinerary.length);
  });
});

describe('objects and media', () => {
  const location = collection.locations.find((l) => l.images.length > 0)!;
  const lodging = collection.lodging.find((l) => l.attachments.length > 0)!;

  it('removes a location, lodging or transportation with its itinerary items', () => {
    for (const id of [location.id, collection.lodging[0].id, collection.transportations[0].id]) {
      const next = withoutObject(collection, id);
      expect(next.itinerary.some((i) => i.object_id === id)).toBe(false);
      expect([...next.locations, ...next.lodging, ...next.transportations].some((o) => o.id === id)).toBe(false);
    }
  });

  it('adds an image to the right object', () => {
    const image = { id: 'new-img', image: 'https://example.org/media/images/x.webp', is_primary: false };
    const added = withImage(collection, location.id, image);
    expect(added.locations.find((l) => l.id === location.id)!.images.at(-1)!.id).toBe('new-img');
  });

  it('keeps exactly one primary image per object', () => {
    const second = 'second-img';
    const two = withImage(collection, location.id, {
      id: second,
      image: 'https://example.org/m.webp',
      is_primary: false,
    });
    const next = withPrimaryImage(two, second);
    const images = next.locations.find((l) => l.id === location.id)!.images;
    expect(images.filter((i) => i.is_primary).map((i) => i.id)).toEqual([second]);
  });

  it('updates a lodging in place', () => {
    const next = withLodging(collection, { ...lodging, reservation_number: 'XYZ' });
    expect(next.lodging).toHaveLength(collection.lodging.length);
    expect(next.lodging.find((l) => l.id === lodging.id)!.reservation_number).toBe('XYZ');
  });
});

describe('withCollectionFields', () => {
  it('drops itinerary items and days outside new dates, like the server', () => {
    const last = view.days.at(-1)!.date;
    const secondLast = view.days.at(-2)!.date;
    const before = collection.itinerary.filter((i) => i.date === last).length;
    expect(before).toBeGreaterThan(0);
    const next = withCollectionFields(collection, { end_date: secondLast });
    expect(next.itinerary.some((i) => i.date === last)).toBe(false);
    expect(next.itinerary_days.some((d) => d.date === last)).toBe(false);
    expect(next.end_date).toBe(secondLast);
  });
});
