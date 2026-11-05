import { setLanguage } from '@/i18n';
import { formatPlainDate } from '@/ui/format';

import {
  dayChipParts,
  daysBetween,
  formatDayLabel,
  formatDuration,
  formatLongDay,
  formatSpan,
  formatTime,
  localDate,
  utcOffset,
  visitTime,
  zoned,
} from '../tz';

describe('time zones', () => {
  // First flight of the Japan collection: departs FRA 17.12. 14:00 CET, lands HND 18.12. 10:45 JST.
  const dep = '2026-12-17T13:00:00Z';
  const arr = '2026-12-18T01:45:00Z';

  it('formats each end in its own zone', () => {
    expect(formatTime(dep, 'Europe/Berlin')).toBe('14:00');
    expect(formatTime(arr, 'Asia/Tokyo')).toBe('10:45');
    expect(localDate(arr, 'Asia/Tokyo')).toBe('2026-12-18');
    expect(localDate(arr, 'Europe/Berlin')).toBe('2026-12-18');
    expect(localDate('2026-12-17T20:00:00Z', 'Asia/Tokyo')).toBe('2026-12-18');
  });

  it('labels zones that differ from the collection zone and shows the day offset', () => {
    const span = formatSpan(zoned(dep, 'Europe/Berlin', 'Asia/Tokyo'), zoned(arr, 'Asia/Tokyo', 'Asia/Tokyo'));
    expect(span).toBe('14:00 Deutschland → 10:45 (+1)');
  });

  it('handles the return flight across New Year (HND → FRA)', () => {
    const span = formatSpan(
      zoned('2027-01-07T15:35:00Z', 'Asia/Tokyo', 'Asia/Tokyo'),
      zoned('2027-01-07T22:00:00Z', 'Europe/Berlin', 'Asia/Tokyo'),
    );
    expect(span).toBe('00:35 → 23:00 Deutschland');
  });

  it('computes offsets, day labels and durations', () => {
    expect(utcOffset(dep, 'Asia/Tokyo')).toBe('+9');
    expect(utcOffset(dep, 'Europe/Berlin')).toBe('+1');
    expect(utcOffset('2026-07-01T12:00:00Z', 'Europe/Berlin')).toBe('+2');
    expect(utcOffset(dep, 'Asia/Kolkata')).toBe('+5:30');
    expect(formatDayLabel('2026-12-31')).toBe('Do., 31.12.');
    expect(daysBetween('2026-12-31', '2027-01-02')).toBe(2);
    expect(formatDuration(150)).toBe('2 Std. 30 Min.');
    expect(formatDuration(45)).toBe('45 Min.');
    expect(formatDuration(null)).toBe('');
  });

  it('reads date-only visits stored as midnight UTC or midnight local', () => {
    // Samples from the Japan collection.
    expect(visitTime('2026-12-19T00:00:00Z', '2026-12-19T00:00:00Z', 'Europe/Berlin')).toEqual({
      date: '2026-12-19',
      time: null,
      endDate: null,
    });
    expect(visitTime('2026-12-18T15:00:00Z', '2026-12-18T15:00:00Z', 'Asia/Tokyo')).toEqual({
      date: '2026-12-19',
      time: null,
      endDate: null,
    });
    // 09:00–10:00 in Tokyo starts at 00:00Z but is not all-day (server rule: the end is not midnight UTC).
    expect(visitTime('2026-12-19T00:00:00Z', '2026-12-19T01:00:00Z', 'Asia/Tokyo')).toEqual({
      date: '2026-12-19',
      time: '09:00',
      endDate: null,
    });
    expect(visitTime('2026-12-19T05:30:00Z', '2026-12-21T05:30:00Z', 'Asia/Tokyo')).toEqual({
      date: '2026-12-19',
      time: '14:30',
      endDate: '2026-12-21',
    });
  });
});

describe('Japanese dates', () => {
  afterEach(() => setLanguage('de'));

  it('formats plain dates the Japanese way', () => {
    setLanguage('ja');
    expect(formatDayLabel('2026-12-17')).toBe('12/17(木)');
    expect(formatLongDay('2026-12-17')).toBe('12月17日 木曜日');
    expect(dayChipParts('2026-12-17')).toEqual({ weekday: '木', day: '17', month: '12月' });
    expect(formatPlainDate('2026-12-17')).toBe('2026/12/17');
  });
});
