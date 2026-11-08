import type { Visit } from '@/api/schemas';
import { setLanguage } from '@/i18n';

import { locationSchedule, shownVisitNote } from '../locationSchedule';
import type { CollectionView, Day } from '../selectors';

const day = (date: string, number: number, name: string | null = null): Day =>
  ({ date, number, name, description: null, entries: [] }) as unknown as Day;

const visit = (patch: Partial<Visit>): Visit =>
  ({ id: 'v', start_date: '2026-11-04T01:00:00Z', end_date: null, timezone: 'Asia/Tokyo', notes: '', ...patch }) as Visit;

describe('shownVisitNote', () => {
  it('hides the website placeholder and keeps a note a person wrote', () => {
    expect(shownVisitNote('Created from itinerary planning')).toBeNull();
    expect(shownVisitNote('')).toBeNull();
    expect(shownVisitNote('Tea')).toBe('Tea');
  });
});

describe('locationSchedule', () => {
  const view = { timeZone: 'Asia/Tokyo', days: [day('2026-11-04', 1, 'Arrival')] } as CollectionView;

  beforeEach(() => setLanguage('en'));
  afterEach(() => setLanguage('de'));

  it('keeps a planned day, and a visit on that day replaces the row without the generated note', () => {
    const rows = locationSchedule(
      view,
      [day('2026-11-04', 1, 'Arrival')],
      [visit({ id: 'v1', notes: 'Created from itinerary planning' })],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].visitId).toBe('v1');
    expect(rows[0].offItinerary).toBe(false);
    expect(rows[0].label).not.toContain('Created from itinerary planning');
  });

  it('adds a visit on a date that is not a planned day', () => {
    const rows = locationSchedule(view, [], [visit({ id: 'v2', start_date: '2026-11-06T01:00:00Z', notes: 'Tea' })]);
    expect(rows[0].offItinerary).toBe(true);
    expect(rows[0].label).toContain('Tea');
  });
});
