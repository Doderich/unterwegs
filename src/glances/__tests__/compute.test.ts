import sample from '../../../docs/samples/collection-detail.json';
import { collectionSchema, type Collection, type CollectionSummary } from '@/api/schemas';
import { setLanguage } from '@/i18n';

import {
  computeReminders,
  focusCollection,
  nextTransportation,
  REMINDER_KINDS,
  REMINDER_LIMIT,
  reminderCollections,
  travelActivity,
  widgetGlances,
  widgetTimeline,
  type CachedCollection,
  type ReminderKind,
} from '../compute';

/*
 * The anonymised Japan sample: 17.12.2026 (flight from Frankfurt, 13:00Z) to 08.01.2027, lodgings in Tokyo time.
 * `TZ` is not set in jest, so the phone's zone is whatever the machine has; the glances use each object's zone.
 */

const collection = collectionSchema.parse(sample);
const at = (iso: string) => new Date(iso);
const link = (path: string) => `unterwegs://${path.replace(/^\//, '')}`;
const all = new Set<ReminderKind>(REMINDER_KINDS);

function cache(c: Collection = collection, updatedAt = Date.parse('2026-12-01T00:00:00Z')) {
  return new Map<string, CachedCollection>([[c.id, { collection: c, updatedAt }]]);
}
const summary = (c: Collection = collection): CollectionSummary => ({
  id: c.id,
  name: c.name,
  start_date: c.start_date,
  end_date: c.end_date,
  is_archived: c.is_archived,
});

beforeAll(() => setLanguage('en'));
afterAll(() => setLanguage('de'));

describe('focusCollection', () => {
  it('follows an upcoming collection whose detail is cached', () => {
    expect(focusCollection([summary()], cache(), at('2026-12-01T12:00:00Z'))?.collection.id).toBe(collection.id);
  });

  it('ignores past and archived collections and those not in the cache', () => {
    expect(focusCollection([summary()], cache(), at('2027-02-01T12:00:00Z'))).toBeNull();
    expect(focusCollection([{ ...summary(), is_archived: true }], cache(), at('2026-12-01T12:00:00Z'))).toBeNull();
    expect(focusCollection([summary()], new Map(), at('2026-12-01T12:00:00Z'))).toBeNull();
  });

  it('skips a collection the user is no longer a member of', () => {
    const left = {
      ...collection,
      collaborators: collection.collaborators.map((c) => ({ ...c, is_current_user: false })),
    };
    expect(focusCollection([summary()], cache(left), at('2026-12-01T12:00:00Z'))).toBeNull();
    expect(reminderCollections([summary()], cache(left), at('2026-12-01T12:00:00Z'))).toEqual([]);
  });
});

describe('widgetGlances', () => {
  const entry = () => cache().get(collection.id)!;

  it('counts down before the collection', () => {
    const g = widgetGlances(entry(), at('2026-12-07T09:00:00Z'), link);
    expect(g.next).toMatchObject({
      state: 'upcoming',
      name: 'Japan Familienreise',
      headline: 'in 10 days',
      short: '10',
    });
    expect(g.next.rows).toEqual([]);
    expect(g.today.state).toBe('none');
    expect(g.next.url).toBe(`unterwegs://collection/${collection.id}`);
  });

  it('shows the day number and only what is still ahead today', () => {
    // 21.12. 09:00 Tokyo: the Shinkansen to Kyoto leaves at 12:00 Tokyo (03:00Z).
    const g = widgetGlances(entry(), at('2026-12-21T00:00:00Z'), link);
    expect(g.next.state).toBe('current');
    expect(g.next.headline).toBe('Day 5 of 23');
    expect(g.next.rows[0]).toMatchObject({ symbol: 'tram.fill', time: '12:00' });
    const later = widgetGlances(entry(), at('2026-12-21T04:00:00Z'), link);
    expect(later.next.rows.some((r) => r.time === '12:00' && r.symbol === 'tram.fill')).toBe(false);
  });

  it("names tonight's lodging and the next departure, in their own zones", () => {
    const g = widgetGlances(entry(), at('2026-12-22T00:00:00Z'), link);
    expect(g.stay).toMatchObject({ state: 'stay', label: 'Tonight', name: '東寺楽屋 Toji Rakuya' });
    expect(g.today.night).toBe('Tonight: 東寺楽屋 Toji Rakuya');
    expect(g.departure).toMatchObject({ state: 'departure', departs: '12:00' });
    expect(g.departure.day).not.toBe('');
  });

  it('labels the flight home with Tokyo time and arrival in Frankfurt time', () => {
    const g = widgetGlances(entry(), at('2027-01-07T00:00:00Z'), link);
    expect(g.departure.departs).toBe('00:35');
    expect(g.departure.arrives).toBe('19:00 Germany');
  });

  it('never shows a reservation number', () => {
    const json = JSON.stringify(widgetGlances(entry(), at('2026-12-22T00:00:00Z'), link));
    for (const l of collection.lodging) if (l.reservation_number) expect(json).not.toContain(l.reservation_number);
  });

  it('marks a stale copy during the collection', () => {
    const old = cache(collection, Date.parse('2026-12-19T00:00:00Z')).get(collection.id)!;
    expect(widgetGlances(old, at('2026-12-22T00:00:00Z'), link).next.footer).toMatch(/^As of /);
    const fresh = cache(collection, Date.parse('2026-12-21T20:00:00Z')).get(collection.id)!;
    expect(widgetGlances(fresh, at('2026-12-22T00:00:00Z'), link).next.footer).toBe('');
  });

  it('has empty states without a collection', () => {
    const g = widgetGlances(null, at('2026-12-07T09:00:00Z'), link);
    expect(g.next).toMatchObject({ state: 'none', name: 'No upcoming collection' });
    expect(g.departure.state).toBe('none');
  });
});

describe('widgetTimeline', () => {
  it('starts now, is sorted, covers the next day and includes the moments rows start', () => {
    const now = at('2026-12-21T00:00:00Z');
    const timeline = widgetTimeline(cache().get(collection.id)!, now, link);
    expect(timeline[0].date).toEqual(now);
    expect(timeline.length).toBeLessThanOrEqual(48);
    const times = timeline.map((e) => e.date.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times).toContain(Date.parse('2026-12-21T03:01:00Z'));
    expect(times.at(-1)! - now.getTime()).toBeGreaterThanOrEqual(23 * 3_600_000);
  });
});

describe('computeReminders', () => {
  const inputs = (missingFiles = 0) => [{ entry: cache().get(collection.id)!, missingFiles }];

  it('schedules only future reminders, soonest first, with unique ids', () => {
    const now = at('2026-12-01T00:00:00Z');
    const reminders = computeReminders(inputs(), all, now);
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders.length).toBeLessThanOrEqual(REMINDER_LIMIT);
    expect(reminders.every((r) => r.at > now.getTime())).toBe(true);
    expect(reminders.map((r) => r.at)).toEqual([...reminders.map((r) => r.at)].sort((a, b) => a - b));
    expect(new Set(reminders.map((r) => r.id)).size).toBe(reminders.length);
  });

  it('reminds the evening before, in the collection zone, and of the flight three hours ahead', () => {
    const reminders = computeReminders(inputs(), all, at('2026-12-01T00:00:00Z'));
    const eve = reminders.find((r) => r.kind === 'collectionStart')!;
    // 16.12. 18:00 Tokyo
    expect(new Date(eve.at).toISOString()).toBe('2026-12-16T09:00:00.000Z');
    const flight = reminders.find((r) => r.kind === 'departure')!;
    expect(new Date(flight.at).toISOString()).toBe('2026-12-17T10:00:00.000Z');
    expect(flight.body).toContain('14:00 Germany');
    expect(flight.path).toMatch(/^\/transport\//);
  });

  it('reminds of check-in two hours ahead in the lodging zone', () => {
    const reminders = computeReminders(inputs(), new Set(['checkIn']), at('2026-12-01T00:00:00Z'));
    const first = reminders[0];
    expect(new Date(first.at).toISOString()).toBe('2026-12-18T04:00:00.000Z');
    expect(first.body).toBe('Oyado Cocochi: check-in from 15:00');
  });

  it('only includes enabled kinds', () => {
    const reminders = computeReminders(inputs(), new Set(['departure']), at('2026-12-01T00:00:00Z'));
    expect(new Set(reminders.map((r) => r.kind))).toEqual(new Set(['departure']));
  });

  it('warns about missing files only when there are some', () => {
    const none = computeReminders(inputs(0), all, at('2026-12-01T00:00:00Z'));
    expect(none.some((r) => r.kind === 'offlineReadiness')).toBe(false);
    const some = computeReminders(inputs(3), all, at('2026-12-01T00:00:00Z'));
    expect(some.find((r) => r.kind === 'offlineReadiness')?.body).toBe('3 photos and files aren’t on this phone yet.');
  });

  it('gives a moved transportation a new id, so the old reminder is cancelled', () => {
    const now = at('2026-12-01T00:00:00Z');
    const moved = {
      ...collection,
      transportations: collection.transportations.map((t, i) => (i === 0 ? { ...t, date: '2026-12-17T14:00:00Z' } : t)),
    };
    const ids = (c: Collection) =>
      computeReminders([{ entry: cache(c).get(c.id)!, missingFiles: 0 }], new Set(['departure']), now).map((r) => r.id);
    const before = new Set(ids(collection));
    const after = ids(moved);
    expect(after.filter((id) => !before.has(id))).toHaveLength(1);
  });

  it('never contains a reservation number', () => {
    const json = JSON.stringify(computeReminders(inputs(5), all, at('2026-12-01T00:00:00Z')));
    for (const l of collection.lodging) if (l.reservation_number) expect(json).not.toContain(l.reservation_number);
  });
});

describe('travelActivity', () => {
  const entry = () => cache().get(collection.id)!;

  it('covers a transportation from 12 hours before departure until 30 minutes after arrival', () => {
    expect(travelActivity(entry(), at('2026-12-17T00:00:00Z'))).toBeNull();
    const before = travelActivity(entry(), at('2026-12-17T02:00:00Z'))!;
    expect(before.props).toMatchObject({ symbol: 'airplane', departs: '14:00 Germany', arrives: '10:45 Tokyo' });
    expect(before.props.lodging).toBe('Oyado Cocochi');
    expect(travelActivity(entry(), at('2026-12-18T02:00:00Z'))?.transportationId).toBe(before.transportationId);
    expect(travelActivity(entry(), at('2026-12-18T02:30:00Z'))).toBeNull();
  });

  it('is null without a collection', () => {
    expect(travelActivity(null, at('2026-12-17T02:00:00Z'))).toBeNull();
  });
});

describe('nextTransportation', () => {
  it('skips what has departed', () => {
    expect(nextTransportation(collection, at('2026-12-17T13:30:00Z'))?.name).toBe('Tokio → Kyoto (Shinkansen)');
  });
});

describe('reminder actions', () => {
  const reminders = () =>
    computeReminders([{ entry: cache().get(collection.id)!, missingFiles: 2 }], all, at('2026-12-01T00:00:00Z'));

  it('offers "Open in Maps" where the reminder has a place', () => {
    const checkIn = reminders().find((r) => r.kind === 'checkIn')!;
    const lodging = collection.lodging.find((l) => l.name === 'Oyado Cocochi')!;
    expect(checkIn.category).toBe('place');
    expect(checkIn.place).toEqual({ label: 'Oyado Cocochi', latitude: lodging.latitude, longitude: lodging.longitude });
  });

  it('offers "Download now" for missing offline files, and no button where there is no place', () => {
    const list = reminders();
    expect(list.find((r) => r.kind === 'offlineReadiness')?.category).toBe('offline');
    expect(list.find((r) => r.kind === 'collectionStart')).toMatchObject({ category: null, place: null });
  });
});

describe('pinned travel', () => {
  const entry = () => cache().get(collection.id)!;
  const train = collection.transportations.find((t) => t.name === 'Tokio → Kyoto (Shinkansen)')!;

  it('shows a pinned transportation before its 12-hour window, and wins over the automatic one', () => {
    expect(travelActivity(entry(), at('2026-12-19T00:00:00Z'))).toBeNull();
    expect(travelActivity(entry(), at('2026-12-19T00:00:00Z'), train.id)?.transportationId).toBe(train.id);
    expect(travelActivity(entry(), at('2026-12-17T02:00:00Z'), train.id)?.transportationId).toBe(train.id);
  });

  it('drops it once it has arrived', () => {
    expect(travelActivity(entry(), at('2026-12-21T04:00:00Z'), train.id)).toBeNull();
  });
});

describe('widget picker', () => {
  it('computes the widgets for each pickable collection beside the focus one', () => {
    const e = cache().get(collection.id)!;
    const [first] = widgetTimeline(null, at('2026-12-07T09:00:00Z'), link, [e]);
    expect(first.glances.next.state).toBe('none');
    expect(first.byCollection[collection.id].next).toMatchObject({ state: 'upcoming', name: 'Japan Familienreise' });
  });
});

describe('widget buttons', () => {
  const entry = () => cache().get(collection.id)!;

  it('gives the Departure widget the next transportations to step through, the first one shown', () => {
    const { departure } = widgetGlances(entry(), at('2026-12-22T00:00:00Z'), link);
    expect(departure.items.length).toBe(5);
    expect(departure.index).toBe(0);
    expect(departure.items[0]).toMatchObject({ departs: departure.departs, url: departure.url });
    expect(departure.items[1].url).not.toBe(departure.items[0].url);
    expect(departure.nextLabel).toBe('Next');
  });

  it('gives the Today widget tomorrow, when tomorrow is a day of the collection', () => {
    const { today } = widgetGlances(entry(), at('2026-12-20T00:00:00Z'), link);
    expect(today.showTomorrow).toBe(false);
    expect(today.tomorrow?.title).toMatch(/^Mon, 21 Dec/);
    expect(today.tomorrow?.rows.some((r) => r.time === '12:00' && r.symbol === 'tram.fill')).toBe(true);
    expect(today.tomorrow?.night).toBe('Night: 東寺楽屋 Toji Rakuya');
    // The last day has no tomorrow.
    expect(widgetGlances(entry(), at('2027-01-08T03:00:00Z'), link).today.tomorrow).toBeNull();
  });
});

describe('Next widget rows', () => {
  it('leaves out locations already marked visited', () => {
    const visited = {
      ...collection,
      locations: collection.locations.map((l) => ({ ...l, is_visited: true })),
    };
    // 19.12. 09:00 Tokyo: seven locations are planned that day.
    const day = at('2026-12-19T00:00:00Z');
    const before = widgetGlances(cache().get(collection.id)!, day, link).next.rows;
    expect(before.some((r) => r.symbol === 'mappin.circle.fill')).toBe(true);
    const rows = widgetGlances(cache(visited).get(collection.id)!, day, link).next.rows;
    expect(rows.every((r) => r.symbol !== 'mappin.circle.fill')).toBe(true);
  });
});

describe('row links', () => {
  it('links each row to its own object', () => {
    const { today } = widgetGlances(cache().get(collection.id)!, at('2026-12-19T00:00:00Z'), link);
    const urls = today.rows.map((r) => r.url);
    expect(urls.length).toBeGreaterThan(1);
    expect(urls.every((u) => /^unterwegs:\/\/(location|lodging|transport)\//.test(u))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
