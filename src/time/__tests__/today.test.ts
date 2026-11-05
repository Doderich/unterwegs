import { initialDayIndex, todayFor, todayIn, collectionPhase, collectionTimeZone } from '../today';

const days = ['2026-12-17', '2026-12-18', '2026-12-20'];

it('opens today, the first day before the collection, the last after, the previous day on a gap', () => {
  expect(initialDayIndex(days, '2026-12-01')).toBe(0);
  expect(initialDayIndex(days, '2026-12-18')).toBe(1);
  expect(initialDayIndex(days, '2026-12-19')).toBe(1);
  expect(initialDayIndex(days, '2027-02-01')).toBe(2);
  expect(initialDayIndex([], '2026-12-18')).toBe(0);
});

it('decides "today" in the collection zone, not the phone zone', () => {
  // 17.12. 16:00 UTC is already the 18th in Tokyo.
  const now = new Date('2026-12-17T16:00:00Z');
  expect(todayIn('Asia/Tokyo', now)).toBe('2026-12-18');
  expect(todayIn('Europe/Berlin', now)).toBe('2026-12-17');
});

describe("today follows tonight's lodging", () => {
  const lodging = [
    { timezone: 'Asia/Tokyo', check_in: '2026-12-18T06:00:00Z', check_out: '2026-12-21T01:00:00Z' },
    { timezone: 'Asia/Bangkok', check_in: '2026-12-21T08:00:00Z', check_out: '2026-12-24T03:00:00Z' },
  ] as never;

  it("uses the night lodging's zone, not the collection zone", () => {
    // 22.12. 16:30 UTC: 23:30 in Bangkok, already the 23rd in Tokyo.
    const now = new Date('2026-12-22T16:30:00Z');
    expect(todayFor(lodging, 'Asia/Tokyo', now)).toEqual({ date: '2026-12-22', timeZone: 'Asia/Bangkok' });
  });

  it('falls back to the collection zone without a lodging for tonight', () => {
    const now = new Date('2026-12-17T16:00:00Z');
    expect(todayFor(lodging, 'Asia/Tokyo', now)).toEqual({ date: '2026-12-18', timeZone: 'Asia/Tokyo' });
    expect(todayFor([], 'Europe/Berlin', now)).toEqual({ date: '2026-12-17', timeZone: 'Europe/Berlin' });
  });
});

it('derives the collection zone from lodgings first', () => {
  expect(
    collectionTimeZone({
      lodging: [{ timezone: 'Asia/Tokyo' }, { timezone: 'Asia/Tokyo' }] as never,
      transportations: [{ end_timezone: 'Europe/Berlin' }, { end_timezone: 'Europe/Berlin' }] as never,
    }),
  ).toBe('Asia/Tokyo');
});

it('classifies collection phases', () => {
  expect(collectionPhase('2026-12-17', '2027-01-08', '2026-11-02')).toBe('upcoming');
  expect(collectionPhase('2026-12-17', '2027-01-08', '2027-01-08')).toBe('current');
  expect(collectionPhase('2026-12-17', '2027-01-08', '2027-01-09')).toBe('past');
  expect(collectionPhase(null, '2027-01-08', '2027-01-09')).toBeNull();
});
