import type { Collection, CollectionSummary, Lodging, Transportation } from '@/api/schemas';
import {
  buildCollectionView,
  isMember,
  locationZone,
  nightOf,
  sortCollections,
  viewToday,
  type CollectionView,
  type DayEntry,
} from '@/data/selectors';
import { transportRoute } from '@/data/transportName';
import { tr } from '@/i18n';
import { arrivalZone, departureZone, lodgingZone } from '@/time/ownZone';
import { collectionPhase, todayIn } from '@/time/today';
import {
  daysBetween,
  deviceTimeZone,
  formatDateTime,
  formatDayLabel,
  formatTime,
  localDate,
  zoneLabel,
} from '@/time/tz';
import { zonedToUtc } from '@/time/zonedInput';

import type {
  DepartureItem,
  DepartureWidgetProps,
  GlanceRow,
  NextWidgetProps,
  StayWidgetProps,
  TodayWidgetProps,
  TravelActivityProps,
} from './types';

/*
 * Glances (docs/GLANCES.md, ADR 0015): what the widgets, reminders and the travel-day Live Activity show, computed
 * from the offline copy only. Pure functions of the cached data and `now`, so they are tested like the selectors.
 */

const HOUR = 3_600_000;
const MINUTE = 60_000;

/** A collection the glances may use: its detail is in the cache, with when that copy was fetched. */
export type CachedCollection = { collection: Collection; updatedAt: number };

/** Builds a deep link from an app path (`/lodging/…`); `Linking.createURL` in the app. */
export type LinkFn = (path: string) => string;

/**
 * The collection widgets follow: the current collection, else the next upcoming one, in the Collections order.
 * Archived and past collections, and those the user is no longer a member of, never qualify.
 */
export function focusCollection(
  summaries: CollectionSummary[],
  cached: ReadonlyMap<string, CachedCollection>,
  now: Date,
): CachedCollection | null {
  const today = todayIn(deviceTimeZone(), now);
  for (const summary of sortCollections(summaries, today)) {
    if (summary.phase !== 'current' && summary.phase !== 'upcoming') continue;
    const entry = cached.get(summary.id);
    if (!entry || !isMember(entry.collection)) continue;
    // The phase in the collection's own zone decides; the list order used the phone's.
    const view = buildCollectionView(entry.collection);
    const phase = collectionPhase(entry.collection.start_date, entry.collection.end_date, viewToday(view, now).date);
    if (phase === 'current' || phase === 'upcoming') return entry;
  }
  return null;
}

/** Collections reminders cover: every current or upcoming collection in the cache. */
export function reminderCollections(
  summaries: CollectionSummary[],
  cached: ReadonlyMap<string, CachedCollection>,
  now: Date,
): CachedCollection[] {
  const today = todayIn(deviceTimeZone(), now);
  return sortCollections(summaries, today)
    .filter((s) => s.phase === 'current' || s.phase === 'upcoming')
    .map((s) => cached.get(s.id))
    .filter((c): c is CachedCollection => !!c && isMember(c.collection));
}

// ---------------------------------------------------------------------------------------------------------------
// Shared pieces

const TRANSPORT_SYMBOLS: Record<string, string> = {
  plane: 'airplane',
  train: 'tram.fill',
  boat: 'ferry.fill',
  bus: 'bus.fill',
  car: 'car.fill',
  taxi: 'car.fill',
  walking: 'figure.walk',
  bike: 'bicycle',
};
const transportSymbol = (type: string | null | undefined) => TRANSPORT_SYMBOLS[type ?? ''] ?? 'tram.fill';

/** Local transport gets its reminder one hour ahead; long-distance travel three. */
const LOCAL_TRANSPORT = new Set(['bus', 'car', 'taxi', 'walking', 'bike']);

/** `13:00`, plus the zone when it isn't the reference zone: `13:00 Kyoto`. */
function timeIn(iso: string, zone: string, referenceZone: string): string {
  const time = formatTime(iso, zone);
  return zone === referenceZone ? time : `${time} ${zoneLabel(zone)}`;
}

/** A date-only time: the website stores all-day check-ins as midnight. */
const isMidnight = (iso: string, zone: string) => formatTime(iso, zone) === '00:00';

/** "As of Thu, 05.11., 13:00" when the copy of a current collection is older than a day. */
function staleFooter(entry: CachedCollection, current: boolean, now: Date): string {
  if (!current || now.getTime() - entry.updatedAt < 24 * HOUR) return '';
  return tr('glances.asOf', { time: formatDateTime(new Date(entry.updatedAt).toISOString(), deviceTimeZone()) });
}

type Row = GlanceRow & { at: number | null };

/** The plan rows of one day: travel, check-ins and locations, in plan order. Notes and checklists stay in the app. */
function dayRows(view: CollectionView, date: string, zone: string, link: LinkFn): Row[] {
  const day = view.days.find((d) => d.date === date);
  if (!day) return [];
  const rows: Row[] = [];
  for (const entry of day.entries) {
    const row = entryRow(view, entry, zone, link);
    if (row) rows.push(row);
  }
  return rows;
}

function entryRow(view: CollectionView, entry: DayEntry, zone: string, link: LinkFn): Row | null {
  const id = view.collection.id;
  switch (entry.kind) {
    case 'transportation': {
      const t = entry.transport;
      const start = departureZone(t, zone);
      return {
        symbol: transportSymbol(t.type),
        time: t.date ? timeIn(t.date, start, zone) : '',
        title: transportRoute(t) || t.name,
        done: false,
        at: t.date ? Date.parse(t.date) : null,
        url: link(`/transport/${id}/${t.id}`),
      };
    }
    case 'lodging': {
      const l = entry.lodging;
      const lz = lodgingZone(l, zone);
      const timed = l.check_in && !isMidnight(l.check_in, lz);
      return {
        symbol: 'bed.double.fill',
        time: timed ? timeIn(l.check_in!, lz, zone) : '',
        title: l.name,
        done: false,
        at: l.check_in ? Date.parse(l.check_in) : null,
        url: link(`/lodging/${id}/${l.id}`),
      };
    }
    case 'location': {
      const location = entry.location;
      const lz = locationZone(view, location);
      return {
        symbol: 'mappin.circle.fill',
        time: entry.startUtc ? timeIn(entry.startUtc, lz, zone) : '',
        title: location.name,
        done: !!location.is_visited,
        at: entry.startUtc ? Date.parse(entry.startUtc) : null,
        url: link(`/location/${id}/${location.id}`),
      };
    }
    default:
      return null;
  }
}

const strip = ({ at: _at, ...row }: Row): GlanceRow => row;

/** What the Next widget lists: what is still ahead today, else where the night is spent, so it is never empty. */
function nextRows(view: CollectionView, rowsToday: Row[], today: string, now: Date, link: LinkFn): GlanceRow[] {
  const rows = ahead(rowsToday, now).slice(0, 3).map(strip);
  if (rows.length) return rows;
  const night = nightOf(view, today);
  if (!night) return [];
  return [
    {
      symbol: 'bed.double.fill',
      time: '',
      title: tr('glances.tonight', { name: night.name }),
      done: false,
      url: link(`/lodging/${view.collection.id}/${night.id}`),
    },
  ];
}

/**
 * Rows still ahead, soonest first: timed ones until they start, then the untimed ones (all day, in plan order).
 * Locations already marked visited are done.
 */
const ahead = (rows: Row[], now: Date) =>
  rows
    .filter((r) => !r.done && (r.at === null || r.at >= now.getTime()))
    .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity));

// ---------------------------------------------------------------------------------------------------------------
// Widgets

export type WidgetGlances = {
  next: NextWidgetProps;
  today: TodayWidgetProps;
  stay: StayWidgetProps;
  departure: DepartureWidgetProps;
};

/** Every widget's props at `now`, from the focus collection (or the empty states without one). */
export function widgetGlances(focus: CachedCollection | null, now: Date, link: LinkFn): WidgetGlances {
  if (!focus) return emptyWidgets(link);
  const { collection } = focus;
  const view = buildCollectionView(collection);
  const { date: today, timeZone } = viewToday(view, now);
  const phase = collectionPhase(collection.start_date, collection.end_date, today);
  const current = phase === 'current';
  const footer = staleFooter(focus, current, now);
  const url = link(`/collection/${collection.id}`);

  const rowsToday = current ? dayRows(view, today, timeZone, link) : [];
  const dayNumber = view.days.find((d) => d.date === today)?.number ?? 0;
  const daysUntil = collection.start_date ? daysBetween(today, collection.start_date.slice(0, 10)) : 0;

  const next: NextWidgetProps = {
    state: current ? 'current' : 'upcoming',
    // The app fills it in: copying the photo is not a pure function (`src/glances/cover.ts`).
    cover: '',
    name: collection.name,
    headline: current
      ? tr('glances.dayOf', { n: dayNumber, total: view.days.length })
      : daysUntil <= 1
        ? tr('glances.startsTomorrow')
        : tr('glances.inDays', { count: daysUntil }),
    short: current ? `${dayNumber}/${view.days.length}` : String(daysUntil),
    shortCaption: current ? tr('glances.dayShort') : tr('glances.daysShort', { count: daysUntil }),
    rows: current ? nextRows(view, rowsToday, today, now, link) : [],
    footer,
    url,
  };

  const night = current ? nightOf(view, today) : null;
  const tomorrowDate = shiftDate(today, 1);
  const tomorrowDay = view.days.find((d) => d.date === tomorrowDate);
  const todayProps: TodayWidgetProps = current
    ? {
        state: 'day',
        title: `${formatDayLabel(today)} · ${collection.name}`,
        rows: rowsToday.slice(0, 6).map(strip),
        night: night ? tr('glances.tonight', { name: night.name }) : '',
        emptyDay: tr('glances.nothingPlanned'),
        tomorrow: tomorrowDay
          ? {
              title: `${formatDayLabel(tomorrowDate)} · ${collection.name}`,
              rows: dayRows(view, tomorrowDate, timeZone, link).slice(0, 6).map(strip),
              night: tomorrowDay.nightLodging ? tr('glances.nightAt', { name: tomorrowDay.nightLodging.name }) : '',
            }
          : null,
        showTomorrow: false,
        toTomorrow: tr('glances.tomorrow'),
        toToday: tr('glances.today'),
        footer,
        url: link(`/collection/${collection.id}`),
      }
    : {
        ...emptyWidgets(link).today,
        title: tr('glances.startsOn', { name: collection.name, date: formatDayLabel(collection.start_date!) }),
        url,
      };

  return {
    next,
    today: todayProps,
    stay: stayProps(view, now, today, timeZone, footer, link) ?? { ...emptyWidgets(link).stay, url },
    departure: departureProps(view, now, today, timeZone, footer, link) ?? { ...emptyWidgets(link).departure, url },
  };
}

function emptyWidgets(link: LinkFn): WidgetGlances {
  const url = link('/');
  const none = tr('glances.noCollection');
  return {
    next: {
      state: 'none',
      name: none,
      headline: '',
      short: '–',
      shortCaption: '',
      rows: [],
      footer: '',
      url,
      cover: '',
    },
    today: {
      state: 'none',
      title: none,
      rows: [],
      night: '',
      emptyDay: '',
      tomorrow: null,
      showTomorrow: false,
      toTomorrow: '',
      toToday: '',
      footer: '',
      url,
    },
    stay: { state: 'none', label: tr('glances.noStay'), name: '', address: '', detail: '', footer: '', url },
    departure: {
      state: 'none',
      symbol: 'tram.fill',
      label: tr('glances.noDeparture'),
      title: '',
      route: '',
      departs: '',
      arrives: '',
      day: '',
      items: [],
      index: 0,
      footer: '',
      url,
    },
  };
}

/** Tonight's lodging; before the collection (or on a night without one) the next lodging still ahead. */
function stayProps(
  view: CollectionView,
  now: Date,
  today: string,
  zone: string,
  footer: string,
  link: LinkFn,
): StayWidgetProps | null {
  const tonight = nightOf(view, today);
  const upcoming = view.lodgings.find((l) => l.checkInDate && l.checkInDate > today)?.lodging;
  const lodging = tonight ?? upcoming;
  if (!lodging) return null;
  const lz = lodgingZone(lodging, zone);
  let detail = '';
  if (lodging.check_in && !isMidnight(lodging.check_in, lz) && Date.parse(lodging.check_in) > now.getTime())
    detail = tr('glances.checkInFrom', { time: timeIn(lodging.check_in, lz, zone) });
  else if (
    lodging.check_out &&
    localDate(lodging.check_out, lz) === localDate(now, lz) &&
    !isMidnight(lodging.check_out, lz)
  )
    detail = tr('glances.checkOutBy', { time: timeIn(lodging.check_out, lz, zone) });
  return {
    state: 'stay',
    label: tonight ? tr('glances.tonightLabel') : tr('glances.nextStay'),
    name: lodging.name,
    address: lodging.location ?? '',
    detail,
    footer,
    url: link(`/lodging/${view.collection.id}/${lodging.id}`),
  };
}

/** Transportations that haven't departed yet, soonest first. */
function upcomingTransportations(collection: Collection, now: Date): Transportation[] {
  return collection.transportations
    .filter((t) => t.date && Date.parse(t.date) >= now.getTime())
    .sort((a, b) => Date.parse(a.date!) - Date.parse(b.date!));
}

/** The next transportation that hasn't departed yet. */
export function nextTransportation(collection: Collection, now: Date): Transportation | null {
  return upcomingTransportations(collection, now)[0] ?? null;
}

/** How many transportations the Departure widget can step through. */
export const DEPARTURE_ITEMS = 5;

function departureProps(
  view: CollectionView,
  now: Date,
  today: string,
  zone: string,
  footer: string,
  link: LinkFn,
): DepartureWidgetProps | null {
  const items = upcomingTransportations(view.collection, now)
    .slice(0, DEPARTURE_ITEMS)
    .map((t): DepartureItem => {
      const start = departureZone(t, zone);
      const end = arrivalZone(t, zone);
      const departDate = localDate(t.date!, start);
      return {
        symbol: transportSymbol(t.type),
        title: t.name,
        route: transportRoute(t),
        departs: timeIn(t.date!, start, zone),
        arrives: t.end_date ? timeIn(t.end_date, end, zone) : '',
        day: departDate === today ? '' : formatDayLabel(departDate),
        url: link(`/transport/${view.collection.id}/${t.id}`),
      };
    });
  if (!items.length) return null;
  return {
    state: 'departure',
    label: tr('glances.departure'),
    ...items[0],
    items,
    index: 0,
    footer,
  };
}

/**
 * iOS timeline: the widgets at each point their content changes over the next day (each row's start, and every
 * hour so the day rolls over at midnight in the collection's zone). At most 48 entries.
 */
export type TimelineEntry = {
  date: Date;
  /** The widgets following the focus collection. */
  glances: WidgetGlances;
  /** The same widgets for each collection a configured iOS widget can be set to (iOS 17+). */
  byCollection: Record<string, WidgetGlances>;
};

/**
 * iOS timeline: the widgets at each point their content changes over the next day (each row's start, and every
 * hour so the day rolls over at midnight in the collection's zone). At most 48 entries. `pickable`: the collections
 * a configured widget can show instead of the focus collection.
 */
export function widgetTimeline(
  focus: CachedCollection | null,
  now: Date,
  link: LinkFn,
  pickable: CachedCollection[] = [],
): TimelineEntry[] {
  const start = now.getTime();
  const points = new Set<number>([start]);
  for (let h = 1; h <= 24; h++) points.add(Math.floor(start / HOUR) * HOUR + h * HOUR);
  for (const entry of new Set([...(focus ? [focus] : []), ...pickable])) {
    const c = entry.collection;
    const instants = [
      ...c.transportations.map((t) => t.date),
      ...c.lodging.flatMap((l) => [l.check_in, l.check_out]),
      ...c.itinerary.map((i) => i.start_datetime),
    ];
    for (const iso of instants) {
      const at = iso ? Date.parse(iso) : NaN;
      // A row disappears from "Next" once it starts, so the entry goes just after.
      if (at > start && at < start + 24 * HOUR) points.add(at + MINUTE);
    }
  }
  return [...points]
    .sort((a, b) => a - b)
    .slice(0, 48)
    .map((ms) => {
      const date = new Date(ms);
      return {
        date,
        glances: widgetGlances(focus, date, link),
        byCollection: Object.fromEntries(pickable.map((e) => [e.collection.id, widgetGlances(e, date, link)])),
      };
    });
}

// ---------------------------------------------------------------------------------------------------------------
// Reminders

export const REMINDER_KINDS = [
  'collectionStart',
  'offlineReadiness',
  'departure',
  'checkIn',
  'checkOut',
  'visit',
  'endOfDay',
] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

/** Android notification channel of each kind, so the system settings can silence one group. */
export const REMINDER_CHANNEL: Record<ReminderKind, 'collections' | 'travel' | 'stays' | 'visits'> = {
  collectionStart: 'collections',
  offlineReadiness: 'collections',
  departure: 'travel',
  checkIn: 'stays',
  checkOut: 'stays',
  visit: 'visits',
  endOfDay: 'visits',
};

export type Reminder = {
  /** Stable: `kind:objectId:instant`. A change of time gives a new id, so the old one is cancelled. */
  id: string;
  kind: ReminderKind;
  at: number;
  title: string;
  body: string;
  /** App path the reminder opens. */
  path: string;
  /** Where "Open in Maps" goes: the departure point, the lodging, the location. */
  place: ReminderPlace | null;
  /** The reminder's action buttons (`src/glances/notifications.ts`). */
  category: 'place' | 'offline' | null;
};

export type ReminderPlace = { label: string; latitude: number; longitude: number };

type AddReminder = (
  kind: ReminderKind,
  objectId: string,
  at: number,
  title: string,
  body: string,
  path: string,
  place?: ReminderPlace | null,
) => void;

const placeOf = (label: string, latitude: number | null | undefined, longitude: number | null | undefined) =>
  latitude != null && longitude != null ? { label, latitude, longitude } : null;

export type ReminderInput = {
  entry: CachedCollection;
  /** Images and attachments of the collection not yet on the device. */
  missingFiles: number;
};

/** At most this many are scheduled; iOS keeps only 64 pending notifications. */
export const REMINDER_LIMIT = 50;

/**
 * Every reminder still ahead for the enabled kinds, soonest first, capped at `REMINDER_LIMIT`. Reminder text never
 * contains booking numbers or prices: it can show on a locked phone.
 */
export function computeReminders(inputs: ReminderInput[], enabled: ReadonlySet<ReminderKind>, now: Date): Reminder[] {
  const out: Reminder[] = [];
  const add: AddReminder = (kind, objectId, at, title, body, path, place = null) => {
    if (!enabled.has(kind) || !Number.isFinite(at) || at <= now.getTime()) return;
    const category = kind === 'offlineReadiness' ? 'offline' : place ? 'place' : null;
    out.push({ id: `${kind}:${objectId}:${at}`, kind, at, title, body, path, place, category });
  };

  for (const { entry, missingFiles } of inputs) {
    const c = entry.collection;
    const view = buildCollectionView(c);
    const zone = view.timeZone;
    const collectionPath = `/collection/${c.id}`;

    if (c.start_date) {
      const start = c.start_date.slice(0, 10);
      const eve = shiftDate(start, -1);
      add(
        'collectionStart',
        c.id,
        wallInstant(eve, '18:00', zone),
        c.name,
        tr('reminders.startsTomorrow', { name: c.name }),
        collectionPath,
      );
      if (missingFiles > 0)
        add(
          'offlineReadiness',
          c.id,
          wallInstant(shiftDate(start, -2), '18:00', zone),
          c.name,
          tr('reminders.notOffline', { count: missingFiles }),
          collectionPath,
        );
    }

    for (const t of c.transportations) {
      if (!t.date) continue;
      const lead = LOCAL_TRANSPORT.has(t.type) ? HOUR : 3 * HOUR;
      const start = departureZone(t, zone);
      add(
        'departure',
        t.id,
        Date.parse(t.date) - lead,
        transportRoute(t) || t.name,
        tr('reminders.departsAt', { name: t.name, time: timeIn(t.date, start, zone) }),
        `/transport/${c.id}/${t.id}`,
        placeOf(t.from_location || t.name, t.origin_latitude, t.origin_longitude),
      );
    }

    for (const l of c.lodging) addLodging(add, c.id, l, zone);

    for (const location of c.locations)
      for (const visit of location.visits) {
        if (!visit.start_date) continue;
        const vz = visit.timezone ?? locationZone(view, location);
        // All-day visits are stored as midnight UTC; only timed visits get a reminder.
        if (visit.start_date.slice(11, 19) === '00:00:00' || isMidnight(visit.start_date, vz)) continue;
        add(
          'visit',
          visit.id,
          Date.parse(visit.start_date) - 30 * MINUTE,
          location.name,
          tr('reminders.visitAt', { name: location.name, time: timeIn(visit.start_date, vz, zone) }),
          `/location/${c.id}/${location.id}`,
          placeOf(location.name, location.latitude, location.longitude),
        );
      }

    // End of day: only today's, since visited state of later days is unknown until then.
    const { date: today, timeZone } = viewToday(view, now);
    const day = view.days.find((d) => d.date === today);
    const open = day?.entries.filter((e) => e.kind === 'location' && !e.location.is_visited).length ?? 0;
    if (day && open > 0)
      add(
        'endOfDay',
        `${c.id}-${today}`,
        wallInstant(today, '21:00', timeZone),
        c.name,
        tr('reminders.markVisited', { count: open }),
        collectionPath,
      );
  }

  return out.sort((a, b) => a.at - b.at).slice(0, REMINDER_LIMIT);
}

function addLodging(add: AddReminder, collectionId: string, l: Lodging, zone: string) {
  const lz = lodgingZone(l, zone);
  const path = `/lodging/${collectionId}/${l.id}`;
  const place = placeOf(l.name, l.latitude, l.longitude);
  if (l.check_in) {
    const timed = !isMidnight(l.check_in, lz);
    add(
      'checkIn',
      l.id,
      timed ? Date.parse(l.check_in) - 2 * HOUR : wallInstant(localDate(l.check_in, lz), '12:00', lz),
      l.name,
      timed
        ? tr('reminders.checkInFrom', { name: l.name, time: timeIn(l.check_in, lz, zone) })
        : tr('reminders.checkInToday', { name: l.name }),
      path,
      place,
    );
  }
  if (l.check_out) {
    const timed = !isMidnight(l.check_out, lz);
    add(
      'checkOut',
      l.id,
      wallInstant(localDate(l.check_out, lz), '08:00', lz),
      l.name,
      timed
        ? tr('reminders.checkOutBy', { name: l.name, time: timeIn(l.check_out, lz, zone) })
        : tr('reminders.checkOutToday', { name: l.name }),
      path,
      place,
    );
  }
}

const wallInstant = (date: string, time: string, zone: string) => Date.parse(zonedToUtc({ date, time }, zone).iso);

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------------------------------------------
// Live Activity

/** Starts this long before departure. */
export const TRAVEL_LEAD = 12 * HOUR;
/** Ends this long after arrival. */
export const TRAVEL_TAIL = 30 * MINUTE;

/**
 * The travel day the Live Activity shows: a transportation departing within 12 hours or under way, until 30 minutes
 * after its arrival (or 30 minutes after departure without an arrival time). The soonest one wins.
 */
export function travelActivity(
  entry: CachedCollection | null,
  now: Date,
  /** A transportation the user put on the Lock Screen themselves: shown from now on, not only 12 h ahead. */
  pinnedId: string | null = null,
): { transportationId: string; collectionId: string; path: string; props: TravelActivityProps; endsAt: number } | null {
  if (!entry) return null;
  const c = entry.collection;
  const view = buildCollectionView(c);
  const { timeZone } = viewToday(view, now);
  const t = now.getTime();
  const candidates = c.transportations
    .filter((x) => x.date)
    .map((x) => {
      const departAt = Date.parse(x.date!);
      const arriveAt = x.end_date ? Date.parse(x.end_date) : 0;
      return { x, departAt, arriveAt, endsAt: (arriveAt || departAt) + TRAVEL_TAIL };
    })
    .filter(({ x, departAt, endsAt }) => (x.id === pinnedId || departAt - TRAVEL_LEAD <= t) && t < endsAt)
    .sort((a, b) => a.departAt - b.departAt);
  const chosen = candidates.find(({ x }) => x.id === pinnedId) ?? candidates[0];
  if (!chosen) return null;
  const { x, departAt, arriveAt, endsAt } = chosen;
  const start = departureZone(x, timeZone);
  const end = arrivalZone(x, timeZone);
  const arrivalDate = localDate(x.end_date ?? x.date!, end);
  const night = nightOf(view, arrivalDate);
  return {
    transportationId: x.id,
    collectionId: c.id,
    path: `/transport/${c.id}/${x.id}`,
    endsAt,
    props: {
      symbol: transportSymbol(x.type),
      title: x.name,
      from: x.start_code || x.from_location || '',
      to: x.end_code || x.to_location || '',
      // Always with the zone: the lock screen has no other context.
      departs: `${formatTime(x.date!, start)} ${zoneLabel(start)}`,
      arrives: x.end_date ? `${formatTime(x.end_date, end)} ${zoneLabel(end)}` : '',
      departAt,
      arriveAt,
      lodging: night?.name ?? '',
      labels: {
        departs: tr('travelActivity.departs'),
        arrives: tr('travelActivity.arrives'),
        arrived: tr('travelActivity.arrived'),
      },
    },
  };
}
