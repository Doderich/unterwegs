import { arrivalZone, departureZone, lodgingZone, sleepsThere, stayDates } from '../ownZone';

it("falls back from the object's own zone to the collection's", () => {
  expect(lodgingZone({ timezone: 'Asia/Bangkok' }, 'Asia/Tokyo')).toBe('Asia/Bangkok');
  expect(lodgingZone({ timezone: null }, 'Asia/Tokyo')).toBe('Asia/Tokyo');
  expect(departureZone({}, 'Asia/Tokyo')).toBe('Asia/Tokyo');
});

it('takes the departure zone for an arrival without one', () => {
  expect(arrivalZone({ start_timezone: 'Europe/Berlin' }, 'Asia/Tokyo')).toBe('Europe/Berlin');
  expect(arrivalZone({ start_timezone: 'Europe/Berlin', end_timezone: 'Asia/Tokyo' }, 'UTC')).toBe('Asia/Tokyo');
  expect(arrivalZone({}, 'Asia/Tokyo')).toBe('Asia/Tokyo');
});

describe('stays', () => {
  // Check-in 18.12. 15:00, check-out 21.12. 10:00, both Tokyo time.
  const hotel = { timezone: 'Asia/Tokyo', check_in: '2026-12-18T06:00:00Z', check_out: '2026-12-21T01:00:00Z' };

  it("reads check-in and check-out dates in the lodging's own zone", () => {
    expect(stayDates(hotel, 'Europe/Berlin')).toEqual({ checkIn: '2026-12-18', checkOut: '2026-12-21', nights: 3 });
  });

  it('sleeps there from the check-in date up to the night before check-out', () => {
    const stay = stayDates(hotel, 'Europe/Berlin');
    expect(['2026-12-17', '2026-12-18', '2026-12-20', '2026-12-21'].map((d) => sleepsThere(stay, d))).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it('has no nights without both dates', () => {
    const open = stayDates({ check_in: hotel.check_in }, 'Asia/Tokyo');
    expect(open).toEqual({ checkIn: '2026-12-18', checkOut: null, nights: 0 });
    expect(sleepsThere(open, '2026-12-18')).toBe(false);
  });
});
