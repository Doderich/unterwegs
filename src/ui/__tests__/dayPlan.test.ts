import type { CollectionView, Day, DayEntry } from '@/data/selectors';
import type { CollectionEdits } from '@/data/useCollectionEdits';
import { setLanguage, tr } from '@/i18n';
import { formatDayLabel } from '@/time/tz';

import { dayChoices, dayHeading, dayLabel, entryActions } from '../dayPlan';

jest.mock('../entries', () => ({ openEntryDetail: jest.fn(), openNote: jest.fn() }));

const day = (date: string, number: number, name: string | null, entries: DayEntry[]): Day =>
  ({ date, number, name, description: null, entries }) as Day;

const note = (id: string, itineraryId: string | null): DayEntry =>
  ({ key: id, startUtc: null, itineraryId, kind: 'note', note: { id, name: 'Note' } }) as DayEntry;

const flight = (id: string): DayEntry =>
  ({ key: id, startUtc: null, itineraryId: null, kind: 'transportation', transport: { id, name: 'Flight' } }) as DayEntry;

describe('day labels', () => {
  beforeEach(() => setLanguage('en'));
  afterEach(() => setLanguage('de'));

  it('writes Day N and the date, and marks today', () => {
    const d = { number: 3, date: '2026-11-04', name: 'Kyoto' };
    expect(dayLabel(d)).toBe(`Day 3 · ${formatDayLabel(d.date)}`);
    expect(dayLabel(d, { today: true })).toBe(`Day 3 · ${formatDayLabel(d.date)} · Today`);
    expect(dayHeading(d, true)).toBe(`Day 3 · ${formatDayLabel(d.date)} · Today · Kyoto`);
  });

  it('drops the day something is already on', () => {
    const days = [day('2026-11-04', 1, 'Arrival', []), day('2026-11-05', 2, null, [])];
    const choices = dayChoices(days, () => undefined, { except: '2026-11-04' });
    expect(choices).toHaveLength(1);
    expect(choices[0].label).toBe(dayLabel(days[1]));
    expect(choices[0].hint).toBeUndefined();
  });
});

describe('entry actions', () => {
  const edits = { addToDay: jest.fn(), moveEntry: jest.fn() } as unknown as CollectionEdits;
  const view = { collection: { id: 'c' }, days: [] } as unknown as CollectionView;

  beforeEach(() => setLanguage('en'));
  afterEach(() => setLanguage('de'));

  it('lets a dated note join the plan and leaves a dated transportation where its times put it', () => {
    const on = day('2026-11-04', 1, null, []);
    const datedNote = entryActions(view, on, note('n', null), edits, jest.fn());
    expect(datedNote[0].label).toBe(tr('dayEdit.addPlan'));
    expect(datedNote[0].disabled).toBeUndefined();

    const datedFlight = entryActions(view, on, flight('t'), edits, jest.fn());
    expect(datedFlight[0].label).toBe(tr('dayEdit.placedInPlanByTimes'));
    expect(datedFlight[0].disabled).toBe(true);
  });

  it('offers move up only when an itinerary item is not first', () => {
    const first = note('a', 'i1');
    const second = note('b', 'i2');
    const on = day('2026-11-04', 1, null, [first, second]);
    const top = entryActions(view, on, first, edits, jest.fn()).map((a) => a.label);
    const below = entryActions(view, on, second, edits, jest.fn()).map((a) => a.label);
    expect(top).not.toContain(tr('dayEdit.moveUp'));
    expect(top).toContain(tr('dayEdit.moveDown'));
    expect(below).toContain(tr('dayEdit.moveUp'));
    expect(below).not.toContain(tr('dayEdit.moveDown'));
  });
});
