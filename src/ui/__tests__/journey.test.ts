import { lodgingSchema, transportationSchema } from '@/api/schemas';

import { staySubtitle } from '../stay';
import { dayShiftLabel, journey } from '../journey';

const flight = (fields: Record<string, unknown>) =>
  transportationSchema.parse({ id: 't1', name: 'Flug', type: 'plane', ...fields });

describe('journey summary', () => {
  it('shows an overnight cross-zone flight in each end’s own zone with the day shift', () => {
    // FRA 17.12. 14:00 CET → HND 18.12. 10:45 JST.
    const j = journey(
      flight({
        date: '2026-12-17T13:00:00Z',
        end_date: '2026-12-18T01:45:00Z',
        start_timezone: 'Europe/Berlin',
        end_timezone: 'Asia/Tokyo',
        from_location: 'Frankfurt',
        start_code: 'FRA',
        to_location: 'Tokio Haneda',
        end_code: 'HND',
        travel_duration_minutes: 705,
      }),
      'Asia/Tokyo',
    );
    expect(j.from).toEqual({
      time: '14:00',
      place: 'Frankfurt (FRA)',
      context: 'Do., 17.12. · Deutschland, UTC+1',
    });
    expect(j.to).toEqual({ time: '10:45', place: 'Tokio Haneda (HND)', context: 'Fr., 18.12. · Tokio, UTC+9' });
    expect(j.dayShift).toBe(1);
    expect(dayShiftLabel(j.dayShift)).toBe('(+1 Tag)');
    expect(j.duration).toBe('11 Std. 45 Min.');
  });

  it('keeps a flight that lands the same local day without a shift, though it crosses midnight in UTC', () => {
    // HND 07.01. 00:35 JST (06.01. in UTC) → FRA 07.01. 23:00 CET.
    const j = journey(
      flight({
        date: '2027-01-06T15:35:00Z',
        end_date: '2027-01-07T22:00:00Z',
        start_timezone: 'Asia/Tokyo',
        end_timezone: 'Europe/Berlin',
      }),
      'Asia/Tokyo',
    );
    expect([j.from.time, j.to.time]).toEqual(['00:35', '23:00']);
    expect(j.dayShift).toBe(0);
    expect(dayShiftLabel(j.dayShift)).toBeNull();
  });

  it('uses the departure zone for an arrival without its own zone, not the collection’s or the phone’s', () => {
    const j = journey(
      flight({ date: '2026-12-17T22:30:00Z', end_date: '2026-12-17T23:30:00Z', start_timezone: 'Europe/Berlin' }),
      'Asia/Tokyo',
    );
    expect([j.from.time, j.to.time]).toEqual(['23:30', '00:30']);
    expect(j.dayShift).toBe(1);
  });

  it('falls back to the collection zone and leaves missing times open', () => {
    const j = journey(flight({ date: '2026-12-20T01:00:00Z' }), 'Asia/Tokyo');
    expect(j.from.time).toBe('10:00');
    expect(j.to).toEqual({ time: '–', context: null, place: null });
    expect(j.dayShift).toBe(0);
  });
});

describe('stay summary', () => {
  const hotel = lodgingSchema.parse({
    id: 'l1',
    name: 'Hotel',
    type: 'hotel',
    check_in: '2026-12-18T06:00:00Z', // 15:00 in Tokyo
    check_out: '2026-12-21T01:00:00Z', // 10:00 in Tokyo
    timezone: 'Asia/Tokyo',
  });

  it('tells check-in, the nights in between and the check-out apart', () => {
    expect(staySubtitle(hotel, '2026-12-18', 'Europe/Berlin')).toBe('Check-in ab 15:00 · Hotel');
    expect(staySubtitle(hotel, '2026-12-19', 'Europe/Berlin')).toBe('Nacht 2 von 3 · Hotel');
    expect(staySubtitle(hotel, '2026-12-20', 'Europe/Berlin')).toBe('Nacht 3 von 3 · Check-out morgen 10:00 · Hotel');
  });
});
