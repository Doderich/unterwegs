import sample from '../../../docs/samples/collection-detail.json';
import {
  dateToPicker,
  endsAfterStart,
  pickerToDate,
  pickerToTime,
  timeToPicker,
  utcToZoned,
  zonedToUtc,
} from '../zonedInput';

describe('zonedToUtc', () => {
  it.each([
    // [date, time, zone, expected UTC]
    ['2026-12-18', '15:00', 'Asia/Tokyo', '2026-12-18T06:00:00Z'],
    ['2026-12-17', '13:00', 'Europe/Berlin', '2026-12-17T12:00:00Z'],
    ['2026-07-01', '13:00', 'Europe/Berlin', '2026-07-01T11:00:00Z'],
    ['2026-12-31', '23:30', 'Asia/Kolkata', '2026-12-31T18:00:00Z'],
    ['2026-12-31', '23:30', 'Asia/Kathmandu', '2026-12-31T17:45:00Z'],
    ['2027-01-01', '00:15', 'Pacific/Kiritimati', '2026-12-31T10:15:00Z'],
    ['2027-01-01', '00:15', 'Pacific/Auckland', '2026-12-31T11:15:00Z'],
    ['2026-12-31', '20:00', 'America/Adak', '2027-01-01T06:00:00Z'],
    ['2026-12-18', '00:00', 'Asia/Tokyo', '2026-12-17T15:00:00Z'],
  ])('%s %s %s → %s', (date, time, zone, expected) => {
    expect(zonedToUtc({ date, time }, zone)).toEqual({ iso: expected, shifted: false });
  });

  it('moves a time inside the spring-forward gap to after the jump', () => {
    // 28.03.2027: Berlin jumps from 02:00 to 03:00.
    const r = zonedToUtc({ date: '2027-03-28', time: '02:30' }, 'Europe/Berlin');
    expect(r.shifted).toBe(true);
    expect(utcToZoned(r.iso, 'Europe/Berlin')).toEqual({ date: '2027-03-28', time: '03:30' });
  });

  it('takes the first occurrence when clocks go back', () => {
    // 25.10.2026: 02:30 happens twice in Berlin; first at +2 (00:30 UTC).
    expect(zonedToUtc({ date: '2026-10-25', time: '02:30' }, 'Europe/Berlin')).toEqual({
      iso: '2026-10-25T00:30:00Z',
      shifted: false,
    });
  });

  it('round-trips every time of the sample collection in its own zone', () => {
    const times: [string, string][] = [
      ...sample.lodging.flatMap((l) =>
        [l.check_in, l.check_out].filter(Boolean).map((t) => [t as string, l.timezone ?? 'UTC'] as [string, string]),
      ),
      ...sample.transportations.flatMap((t) => [
        ...(t.date ? [[t.date, t.start_timezone ?? 'UTC'] as [string, string]] : []),
        ...(t.end_date ? [[t.end_date, t.end_timezone ?? 'UTC'] as [string, string]] : []),
      ]),
    ];
    expect(times.length).toBeGreaterThan(10);
    for (const [iso, zone] of times) {
      const back = zonedToUtc(utcToZoned(iso, zone), zone).iso;
      expect(Date.parse(back)).toBe(Math.floor(Date.parse(iso) / 60_000) * 60_000);
    }
  });
});

describe('picker values', () => {
  it('keeps the wall-clock components whatever the device zone', () => {
    expect(pickerToDate(dateToPicker('2027-03-28'))).toBe('2027-03-28');
    expect(pickerToTime(timeToPicker('02:30'))).toBe('02:30');
    expect(pickerToTime(timeToPicker('23:59'))).toBe('23:59');
  });
});

describe('endsAfterStart', () => {
  it('rejects an end before or at the start, accepts missing values', () => {
    expect(endsAfterStart('2027-03-27T00:30:00Z', '2027-03-27T02:45:00Z')).toBe(true);
    expect(endsAfterStart('2027-03-27T00:30:00Z', '2027-03-26T02:45:00Z')).toBe(false);
    expect(endsAfterStart('2027-03-27T00:30:00Z', '2027-03-27T00:30:00Z')).toBe(false);
    expect(endsAfterStart(null, '2027-03-26T02:45:00Z')).toBe(true);
  });
});
