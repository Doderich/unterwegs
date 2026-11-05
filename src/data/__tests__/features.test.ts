import { calendarEventSchema, inviteSchema } from '@/api/schemas';

import { agenda, eventDate } from '../calendar';
import { categoryName, sortCategories } from '../categories';

// Shapes as returned by v0.13.1 (SERVER.md); people from scripts/anonymise-sample.ts style, made up.
const ev = (e: Record<string, unknown>) =>
  calendarEventSchema.parse({ id: 'x', type: 'visit', title: 'T', start: '2026-12-18', ...e });

describe('categoryName', () => {
  it('transliterates like the website and stays unique', () => {
    expect(categoryName('Sehenswürdigkeit', [])).toBe('sehenswuerdigkeit');
    expect(categoryName('Café & Bar', [])).toBe('cafebar');
    expect(categoryName('Tempel', [{ name: 'tempel' }, { name: 'tempel2' }])).toBe('tempel3');
    expect(categoryName('🎌', [])).toBe('kategorie');
  });

  it('sorts by shown name with "general" last', () => {
    const sorted = sortCategories([
      { name: 'general', display_name: 'General' },
      { name: 'stadt', display_name: 'Stadt' },
      { name: 'flughafen', display_name: 'Flughafen' },
    ]);
    expect(sorted.map((c) => c.name)).toEqual(['flughafen', 'stadt', 'general']);
  });
});

describe('invites', () => {
  it('accepts numeric and UUID invite ids', () => {
    expect(inviteSchema.parse({ id: 7, collection: 'c1', name: 'Japan' }).id).toBe('7');
    expect(inviteSchema.parse({ id: 'u-1', collection: 'c1' }).id).toBe('u-1');
  });
});

describe('calendar', () => {
  it('keeps plain dates and the UTC date of all-day visits', () => {
    expect(eventDate(ev({ start: '2026-12-18' }), 'start', 'Europe/Berlin')).toBe('2026-12-18');
    const allDay = ev({ start: '2026-12-19T00:00:00Z', all_day: true, timezone: 'America/New_York' });
    expect(eventDate(allDay, 'start', 'Europe/Berlin')).toBe('2026-12-19');
  });

  it('puts timed events on their local date in their own zone', () => {
    const flight = ev({
      type: 'transportation',
      start: '2026-12-17T23:30:00Z',
      all_day: false,
      timezone: 'Asia/Tokyo',
    });
    expect(eventDate(flight, 'start', 'Europe/Berlin')).toBe('2026-12-18');
  });

  it('groups by day, collections first then by time, and splits off the past', () => {
    const events = [
      ev({ id: 'v', start: '2026-12-18T03:00:00Z', all_day: false, timezone: 'Asia/Tokyo', title: 'Tempel' }),
      ev({ id: 't', type: 'transportation', start: '2026-12-18T01:00:00Z', all_day: false, timezone: 'Asia/Tokyo' }),
      ev({ id: 'c', type: 'collection', start: '2026-12-17', end: '2027-01-08', all_day: true }),
      ev({ id: 'old', start: '2025-05-01' }),
    ];
    const { upcoming, past } = agenda(events, '2026-12-18', 'Europe/Berlin');
    expect(upcoming.map((d) => [d.date, d.events.map((e) => e.id)])).toEqual([
      ['2026-12-17', ['c']],
      ['2026-12-18', ['t', 'v']],
    ]);
    expect(upcoming[1].events.map((e) => e.time)).toEqual(['10:00', '12:00']);
    expect(past.map((d) => d.date)).toEqual(['2025-05-01']);
  });
});
