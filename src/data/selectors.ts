import type { Checklist, CollectionSummary, Location, Lodging, Note, Transportation, Collection } from '@/api/schemas';
import { todayFor, collectionPhase, collectionTimeZone } from '@/time/today';
import { departureZone, sleepsThere, stayDates } from '@/time/ownZone';
import { zoneForPlace } from '@/time/placeZone';
import { daysBetween, localDate } from '@/time/tz';

/** `itineraryId`: the itinerary item behind the entry; null for entries placed by date only (movable only on the website). */
type EntryBase = { key: string; startUtc: string | null; itineraryId: string | null };

export type DayEntry =
  | (EntryBase & { kind: 'transportation'; transport: Transportation })
  | (EntryBase & { kind: 'lodging'; lodging: Lodging })
  | (EntryBase & { kind: 'location'; location: Location })
  | (EntryBase & { kind: 'note'; note: Note })
  | (EntryBase & { kind: 'checklist'; checklist: Checklist });

/** Id of the object behind an entry (location, lodging, …). */
export function entryObjectId(e: DayEntry): string {
  switch (e.kind) {
    case 'transportation':
      return e.transport.id;
    case 'lodging':
      return e.lodging.id;
    case 'location':
      return e.location.id;
    case 'note':
      return e.note.id;
    case 'checklist':
      return e.checklist.id;
  }
}

export function entryTitle(e: DayEntry): string {
  switch (e.kind) {
    case 'transportation':
      return e.transport.name;
    case 'lodging':
      return e.lodging.name;
    case 'location':
      return e.location.name;
    case 'note':
      return e.note.name;
    case 'checklist':
      return e.checklist.name;
  }
}

export type Day = {
  date: string;
  /** 1-based day number within the collection. */
  number: number;
  name: string | null;
  description: string | null;
  entries: DayEntry[];
  /** Where we sleep the night after this day. */
  nightLodging: Lodging | null;
};

export type CollectionView = {
  collection: Collection;
  timeZone: string;
  days: Day[];
  lodgings: { lodging: Lodging; nights: number; checkInDate: string | null; checkOutDate: string | null }[];
};

/** Today's date and zone for this collection (see `todayFor`). */
export const viewToday = (view: CollectionView, now?: Date) => todayFor(view.collection.lodging, view.timeZone, now);

/** The night lodging after `date`, if the collection has that day and a lodging for its night. */
export const nightOf = (view: CollectionView, date: string | null | undefined): Lodging | null =>
  (date && view.days.find((d) => d.date === date)?.nightLodging) || null;

/** The zone a new time on `date` starts in: that night's lodging's zone, else the collection time zone. */
export const zoneOn = (view: CollectionView, date: string | null | undefined): string =>
  nightOf(view, date)?.timezone ?? view.timeZone;

function sortKey(e: DayEntry): string {
  return e.startUtc ?? '';
}

/**
 * Resolves the itinerary into days. Itinerary items only reference objects (`content_type` + `object_id`);
 * the objects themselves are embedded in the same collection response.
 */
export function buildCollectionView(collection: Collection): CollectionView {
  const timeZone = collectionTimeZone(collection);
  const byId = {
    location: new Map(collection.locations.map((x) => [x.id, x])),
    lodging: new Map(collection.lodging.map((x) => [x.id, x])),
    transportation: new Map(collection.transportations.map((x) => [x.id, x])),
    note: new Map(collection.notes.map((x) => [x.id, x])),
    checklist: new Map(collection.checklists.map((x) => [x.id, x])),
  };

  const dayMeta = new Map(collection.itinerary_days.map((d) => [d.date, d]));
  const dates = new Set<string>(collection.itinerary_days.map((d) => d.date));
  // Every date of the collection is a day, also before anything is planned on it (a new collection has no
  // itinerary days on the server yet).
  for (const date of dateRange(collection.start_date, collection.end_date)) dates.add(date);
  const entriesByDate = new Map<string, { order: number; entry: DayEntry }[]>();
  const scheduledTransports = new Set<string>();
  const scheduledNotes = new Set<string>();

  const push = (date: string, order: number, entry: DayEntry) => {
    dates.add(date);
    const list = entriesByDate.get(date) ?? [];
    list.push({ order, entry });
    entriesByDate.set(date, list);
  };

  for (const item of collection.itinerary) {
    if (item.is_global || !item.date) continue;
    const date = item.date.slice(0, 10);
    const key = item.id;
    if (item.content_type === 'transportation') {
      const transport = byId.transportation.get(item.object_id);
      if (!transport) continue;
      scheduledTransports.add(transport.id);
      push(date, item.order, {
        kind: 'transportation',
        key,
        itineraryId: key,
        transport,
        startUtc: transport.date ?? null,
      });
    } else if (item.content_type === 'lodging') {
      const lodging = byId.lodging.get(item.object_id);
      if (lodging)
        push(date, item.order, { kind: 'lodging', key, itineraryId: key, lodging, startUtc: lodging.check_in ?? null });
    } else if (item.content_type === 'location') {
      const location = byId.location.get(item.object_id);
      if (location)
        push(date, item.order, {
          kind: 'location',
          key,
          itineraryId: key,
          location,
          startUtc: item.start_datetime ?? null,
        });
    } else if (item.content_type === 'note') {
      const note = byId.note.get(item.object_id);
      if (note) {
        scheduledNotes.add(note.id);
        push(date, item.order, { kind: 'note', key, itineraryId: key, note, startUtc: item.start_datetime ?? null });
      }
    } else if (item.content_type === 'checklist') {
      const checklist = byId.checklist.get(item.object_id);
      if (checklist) {
        scheduledNotes.add(checklist.id);
        push(date, item.order, {
          kind: 'checklist',
          key,
          itineraryId: key,
          checklist,
          startUtc: item.start_datetime ?? null,
        });
      }
    }
  }

  // Dated notes / checklists not on the itinerary show up on their day (only days the collection already has).
  for (const note of collection.notes) {
    const date = note.date?.slice(0, 10);
    if (scheduledNotes.has(note.id) || !date || !dates.has(date)) continue;
    push(date, Number.MAX_SAFE_INTEGER, { kind: 'note', key: `n-${note.id}`, itineraryId: null, note, startUtc: null });
  }
  for (const checklist of collection.checklists) {
    const date = checklist.date?.slice(0, 10);
    if (scheduledNotes.has(checklist.id) || !date || !dates.has(date)) continue;
    push(date, Number.MAX_SAFE_INTEGER, {
      kind: 'checklist',
      key: `c-${checklist.id}`,
      itineraryId: null,
      checklist,
      startUtc: null,
    });
  }

  // Transports not on the itinerary still belong to their departure day.
  for (const t of collection.transportations) {
    if (scheduledTransports.has(t.id) || !t.date) continue;
    const date = localDate(t.date, departureZone(t, timeZone));
    push(date, Number.MAX_SAFE_INTEGER, {
      kind: 'transportation',
      key: `t-${t.id}`,
      itineraryId: null,
      transport: t,
      startUtc: t.date,
    });
  }

  const sortedDates = [...dates].sort();
  const lodgingDates = collection.lodging.map((l) => ({ lodging: l, ...stayDates(l, timeZone) }));

  const days: Day[] = sortedDates.map((date, i) => {
    const entries = (entriesByDate.get(date) ?? [])
      .sort((a, b) => a.order - b.order || sortKey(a.entry).localeCompare(sortKey(b.entry)))
      .map((x) => x.entry);
    const night = lodgingDates.find((l) => sleepsThere(l, date));
    const meta = dayMeta.get(date);
    return {
      date,
      number: i + 1,
      name: meta?.name ?? null,
      description: meta?.description ?? null,
      entries,
      nightLodging: night?.lodging ?? null,
    };
  });

  const lodgings = lodgingDates
    .map(({ lodging, checkIn, checkOut, nights }) => ({ lodging, checkInDate: checkIn, checkOutDate: checkOut, nights }))
    .sort((a, b) => (a.checkInDate ?? '').localeCompare(b.checkInDate ?? ''));

  return { collection, timeZone, days, lodgings };
}

/** `YYYY-MM-DD` dates from start to end, inclusive; empty when a date is missing or the range is implausible. */
export function dateRange(start: string | null | undefined, end: string | null | undefined): string[] {
  if (!start || !end) return [];
  const a = start.slice(0, 10);
  const n = daysBetween(a, end.slice(0, 10));
  if (n < 0 || n > 366) return [];
  const [y, m, d] = a.split('-').map(Number);
  return Array.from({ length: n + 1 }, (_, i) => new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
}

/**
 * Zone of the nearest point of the collection that has one (lodging, transportation ends), within `maxKm`.
 * The server can't tell the zone of a place; when planning a new country from home, a nearby lodging or station
 * of the same collection is the best guess. Null when nothing is close.
 */
export function nearestZone(collection: Collection, latitude: number, longitude: number, maxKm = 400): string | null {
  const points: { lat: number; lon: number; zone: string }[] = [];
  for (const l of collection.lodging) {
    if (l.latitude != null && l.longitude != null && l.timezone)
      points.push({ lat: l.latitude, lon: l.longitude, zone: l.timezone });
  }
  for (const t of collection.transportations) {
    if (t.origin_latitude != null && t.origin_longitude != null && t.start_timezone)
      points.push({ lat: t.origin_latitude, lon: t.origin_longitude, zone: t.start_timezone });
    if (t.destination_latitude != null && t.destination_longitude != null && t.end_timezone)
      points.push({ lat: t.destination_latitude, lon: t.destination_longitude, zone: t.end_timezone });
  }
  let best: { km: number; zone: string } | null = null;
  for (const p of points) {
    const km = distanceKm(latitude, longitude, p.lat, p.lon);
    if (km <= maxKm && (!best || km < best.km)) best = { km, zone: p.zone };
  }
  return best?.zone ?? null;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** Fields of `next` that differ from `original` (for partial updates). */
export function changedFields<T extends Record<string, unknown>>(
  original: Record<string, unknown>,
  next: T,
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) {
    const before = original[k];
    const same =
      (before ?? null) === (v ?? null) ||
      (Array.isArray(v) && sameList(Array.isArray(before) ? before : [], v)) ||
      (typeof v === 'number' && before != null && Number(before) === v) ||
      (typeof v === 'string' &&
        before != null &&
        v !== '' &&
        !Number.isNaN(Number(v)) &&
        Number(before) === Number(v) &&
        typeof before !== 'boolean');
    if (!same) out[k] = v;
  }
  return out as Partial<T>;
}

function sameList(a: unknown[], b: unknown[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/**
 * The signed-in user owns the collection or it is shared with them; false for someone else's public collection
 * (read-only). Without collaborator data, assume yes, as before.
 */
export function isMember(collection: Collection): boolean {
  return collection.collaborators.length === 0 || collection.collaborators.some((c) => c.is_current_user);
}

/**
 * The time zone of a location: of its latest visit with one, else of nearby lodging or transportation, else of its
 * country (with the nearest zone in countries with several), else the collection's.
 */
export function locationZone(view: CollectionView, location: Location): string {
  const visited = [...location.visits].reverse().find((v) => v.timezone)?.timezone;
  if (visited) return visited;
  if (location.latitude == null || location.longitude == null) return view.timeZone;
  return (
    nearestZone(view.collection, location.latitude, location.longitude) ??
    zoneForPlace(location.country?.country_code, location.latitude, location.longitude) ??
    view.timeZone
  );
}

/** The signed-in user owns the collection (only the owner may change the collection itself). */
export function isOwner(collection: Collection): boolean {
  return collection.collaborators.some((c) => c.is_owner && c.is_current_user);
}

export type UnscheduledItem =
  | { kind: 'location'; id: string; title: string; location: Location }
  | { kind: 'lodging'; id: string; title: string; lodging: Lodging }
  | { kind: 'note'; id: string; title: string; note: Note }
  | { kind: 'checklist'; id: string; title: string; checklist: Checklist };

/**
 * Objects that appear on no day: no itinerary item and no own date. Lodging with check-in / check-out counts as
 * placed (night lodging); transportations always sit on their departure date.
 */
export function unscheduled(view: CollectionView): UnscheduledItem[] {
  const c = view.collection;
  const onItinerary = new Set(c.itinerary.filter((i) => !i.is_global && i.date).map((i) => i.object_id));
  const days = new Set(view.days.map((d) => d.date));
  const dated = (date: string | null | undefined) => !!date && days.has(date.slice(0, 10));
  return [
    ...c.locations
      .filter((l) => !onItinerary.has(l.id))
      .map((l) => ({ kind: 'location' as const, id: l.id, title: l.name, location: l })),
    ...c.lodging
      .filter((l) => !onItinerary.has(l.id) && !(l.check_in && l.check_out))
      .map((l) => ({ kind: 'lodging' as const, id: l.id, title: l.name, lodging: l })),
    ...c.notes
      .filter((n) => !onItinerary.has(n.id) && !dated(n.date))
      .map((n) => ({ kind: 'note' as const, id: n.id, title: n.name, note: n })),
    ...c.checklists
      .filter((x) => !onItinerary.has(x.id) && !dated(x.date))
      .map((x) => ({ kind: 'checklist' as const, id: x.id, title: x.name, checklist: x })),
  ];
}

export type MapPoint = {
  key: string;
  kind: 'location' | 'lodging' | 'transport-start' | 'transport-end';
  id: string;
  title: string;
  subtitle: string | null;
  latitude: number;
  longitude: number;
  /** Plain dates on which this point appears in the itinerary (for the day filter). */
  dates: string[];
};

export type MapLine = { key: string; id: string; type: string; from: [number, number]; to: [number, number] };

function mappedId(e: DayEntry): string | null {
  if (e.kind === 'transportation') return e.transport.id;
  if (e.kind === 'lodging') return e.lodging.id;
  if (e.kind === 'location') return e.location.id;
  return null;
}

export function mapData(view: CollectionView): { points: MapPoint[]; lines: MapLine[] } {
  const datesFor = new Map<string, Set<string>>();
  for (const day of view.days) {
    for (const e of day.entries) {
      const id = mappedId(e);
      if (id) (datesFor.get(id) ?? datesFor.set(id, new Set()).get(id)!).add(day.date);
    }
    if (day.nightLodging) {
      const id = day.nightLodging.id;
      (datesFor.get(id) ?? datesFor.set(id, new Set()).get(id)!).add(day.date);
    }
  }
  const dates = (id: string) => [...(datesFor.get(id) ?? [])];
  const ok = (lat: number | null | undefined, lng: number | null | undefined): lat is number =>
    typeof lat === 'number' && typeof lng === 'number';

  const points: MapPoint[] = [];
  const lines: MapLine[] = [];
  for (const l of view.collection.locations) {
    if (ok(l.latitude, l.longitude))
      points.push({
        key: `loc-${l.id}`,
        kind: 'location',
        id: l.id,
        title: l.name,
        subtitle: l.category?.display_name ?? null,
        latitude: l.latitude,
        longitude: l.longitude!,
        dates: dates(l.id),
      });
  }
  for (const l of view.collection.lodging) {
    if (ok(l.latitude, l.longitude))
      points.push({
        key: `lod-${l.id}`,
        kind: 'lodging',
        id: l.id,
        title: l.name,
        subtitle: l.location ?? null,
        latitude: l.latitude,
        longitude: l.longitude!,
        dates: dates(l.id),
      });
  }
  for (const t of view.collection.transportations) {
    const d = dates(t.id);
    if (ok(t.origin_latitude, t.origin_longitude))
      points.push({
        key: `ts-${t.id}`,
        kind: 'transport-start',
        id: t.id,
        title: t.from_location ?? t.name,
        subtitle: t.name,
        latitude: t.origin_latitude,
        longitude: t.origin_longitude!,
        dates: d,
      });
    if (ok(t.destination_latitude, t.destination_longitude))
      points.push({
        key: `te-${t.id}`,
        kind: 'transport-end',
        id: t.id,
        title: t.to_location ?? t.name,
        subtitle: t.name,
        latitude: t.destination_latitude,
        longitude: t.destination_longitude!,
        dates: d,
      });
    if (ok(t.origin_latitude, t.origin_longitude) && ok(t.destination_latitude, t.destination_longitude))
      lines.push({
        key: `line-${t.id}`,
        id: t.id,
        type: t.type,
        from: [t.origin_longitude!, t.origin_latitude],
        to: [t.destination_longitude!, t.destination_latitude],
      });
  }
  return { points, lines };
}

/** Collections list order: current collection first, then upcoming (soonest first), then past (latest first). */
export function sortCollections(
  collections: CollectionSummary[],
  today: string,
): (CollectionSummary & { phase: string | null })[] {
  const rank = { current: 0, upcoming: 1, past: 2 } as const;
  return collections
    .filter((t) => !t.is_archived)
    .map((t) => ({ ...t, phase: collectionPhase(t.start_date, t.end_date, today) }))
    .sort((a, b) => {
      const ra = a.phase ? rank[a.phase as keyof typeof rank] : 3;
      const rb = b.phase ? rank[b.phase as keyof typeof rank] : 3;
      if (ra !== rb) return ra - rb;
      const sa = a.start_date ?? '';
      const sb = b.start_date ?? '';
      return a.phase === 'past' ? sb.localeCompare(sa) : sa.localeCompare(sb);
    });
}

/** All authenticated media URLs of a collection (images + attachments), for offline prefetch. */
export function collectionMediaUrls(collection: Collection): { images: string[]; attachments: string[] } {
  const images = new Set<string>();
  const attachments = new Set<string>();
  const collect = (x: { images: { image: string }[]; attachments: { file: string }[] }) => {
    x.images.forEach((i) => images.add(i.image));
    x.attachments.forEach((a) => attachments.add(a.file));
  };
  collection.locations.forEach(collect);
  for (const l of collection.locations)
    for (const v of l.visits) for (const a of v.activities) if (a.gpx_file) attachments.add(a.gpx_file);
  collection.lodging.forEach(collect);
  collection.transportations.forEach(collect);
  if (collection.primary_image) images.add(collection.primary_image.image);
  return { images: [...images], attachments: [...attachments] };
}
