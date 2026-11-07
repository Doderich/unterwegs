import type {
  Attachment,
  Checklist,
  Collection,
  Image,
  ItineraryDay,
  ItineraryItem,
  Location,
  Lodging,
  Note,
  Transportation,
  Visit,
} from '@/api/schemas';

import type { Day } from './selectors';

/*
 * Pure collection updates for optimistic edits: the screen changes at once, the server answer
 * (and a refetch of the whole collection) replaces it right after.
 */

const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

export const withNote = (collection: Collection, note: Note): Collection => ({
  ...collection,
  notes: upsert(collection.notes, note),
});

export const withChecklist = (collection: Collection, checklist: Checklist): Collection => ({
  ...collection,
  checklists: upsert(collection.checklists, checklist),
});

export const withLocationObject = (collection: Collection, location: Location): Collection => ({
  ...collection,
  locations: upsert(collection.locations, location),
});

export const withLodging = (collection: Collection, lodging: Lodging): Collection => ({
  ...collection,
  lodging: upsert(collection.lodging, lodging),
});

export const withTransportation = (collection: Collection, transportation: Transportation): Collection => ({
  ...collection,
  transportations: upsert(collection.transportations, transportation),
});

/**
 * Removes an object (location, lodging, transportation, note or checklist) and the itinerary items pointing to it,
 * like the server does on delete.
 */
export const withoutObject = (collection: Collection, objectId: string): Collection => ({
  ...collection,
  locations: collection.locations.filter((x) => x.id !== objectId),
  lodging: collection.lodging.filter((x) => x.id !== objectId),
  transportations: collection.transportations.filter((x) => x.id !== objectId),
  notes: collection.notes.filter((n) => n.id !== objectId),
  checklists: collection.checklists.filter((c) => c.id !== objectId),
  itinerary: collection.itinerary.filter((i) => i.object_id !== objectId),
});

export type MediaOwner = 'location' | 'lodging' | 'transportation';
type WithMedia = { id: string; images: Image[]; attachments: Attachment[] };

/** Applies `fn` to the object with `objectId`, whichever list it is in. */
function mapMediaOwner(collection: Collection, objectId: string, fn: <T extends WithMedia>(o: T) => T): Collection {
  const map = <T extends WithMedia>(list: T[]) => list.map((o) => (o.id === objectId ? fn(o) : o));
  return {
    ...collection,
    locations: map(collection.locations),
    lodging: map(collection.lodging),
    transportations: map(collection.transportations),
  };
}

export const withImage = (collection: Collection, objectId: string, image: Image): Collection =>
  mapMediaOwner(collection, objectId, (o) => ({ ...o, images: upsert(o.images, image) }));

/** The only primary image of its object, like `toggle_primary` on the server. */
export const withPrimaryImage = (collection: Collection, imageId: string): Collection => {
  const owner = [...collection.locations, ...collection.lodging, ...collection.transportations].find((o) =>
    o.images.some((i) => i.id === imageId),
  );
  return owner
    ? mapMediaOwner(collection, owner.id, (o) => ({
        ...o,
        images: o.images.map((i) => ({ ...i, is_primary: i.id === imageId })),
      }))
    : collection;
};

/**
 * New collection dates. Like the server, itinerary items and itinerary days outside the range are dropped.
 */
export const withCollectionFields = (
  collection: Collection,
  fields: { name?: string; description?: string | null; start_date?: string; end_date?: string; link?: string | null },
): Collection => {
  const next = { ...collection, ...fields };
  const start = next.start_date;
  const end = next.end_date;
  if (!start || !end) return next;
  const inRange = (date: string | null | undefined) => !!date && date >= start && date <= end;
  return {
    ...next,
    itinerary: next.itinerary.filter((i) => i.is_global || inRange(i.date)),
    itinerary_days: next.itinerary_days.filter((d) => inRange(d.date)),
  };
};

/** Day metadata keyed by date (a day may not have a server entry yet). */
export const withDay = (collection: Collection, day: ItineraryDay): Collection => ({
  ...collection,
  itinerary_days: [...collection.itinerary_days.filter((d) => d.date !== day.date && d.id !== day.id), day],
});

export const withItineraryItems = (collection: Collection, items: ItineraryItem[]): Collection =>
  items.reduce((t, item) => ({ ...t, itinerary: upsert(t.itinerary, item) }), collection);

export const withoutItineraryItem = (collection: Collection, itemId: string): Collection => ({
  ...collection,
  itinerary: collection.itinerary.filter((i) => i.id !== itemId),
});

export const withLocation = (collection: Collection, locationId: string, patch: Partial<Location>): Collection => ({
  ...collection,
  locations: collection.locations.map((l) => (l.id === locationId ? { ...l, ...patch } : l)),
});

export const withVisit = (
  collection: Collection,
  visit: Visit & { location?: string },
  locationId: string,
): Collection => ({
  ...collection,
  locations: collection.locations.map((l) => (l.id === locationId ? { ...l, visits: upsert(l.visits, visit) } : l)),
});

export type OrderUpdate = { id: string; date: string; order: number };

/** Itinerary ids of a day in the order the app shows them (entries without an itinerary item are skipped). */
const dayOrder = (day: Day): string[] => day.entries.flatMap((e) => (e.itineraryId ? [e.itineraryId] : []));

/** Swap an entry with its neighbour; returns the new order of the whole day, or null at the edge. */
export function moveWithinDay(day: Day, itineraryId: string, direction: -1 | 1): OrderUpdate[] | null {
  const ids = dayOrder(day);
  const i = ids.indexOf(itineraryId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids.map((id, order) => ({ id, date: day.date, order }));
}

export const withOrder = (collection: Collection, updates: OrderUpdate[]): Collection => {
  const byId = new Map(updates.map((u) => [u.id, u]));
  return {
    ...collection,
    itinerary: collection.itinerary.map((i) => {
      const u = byId.get(i.id);
      return u ? { ...i, date: u.date, order: u.order } : i;
    }),
  };
};

/** Placeholder ids for optimistic creates; replaced by the server response. */
export const tempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
