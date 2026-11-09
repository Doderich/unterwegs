import { zonedToUtc, utcToZoned } from '@/time/zonedInput';
import { isTimeZone, zoneDayDifference } from '../timeZones';

it('compares the same instant across midnight and the date line', () => {
  expect(zoneDayDifference('2026-12-20T23:30:00Z', 'Europe/Berlin', 'America/New_York')).toBe(-1);
  expect(zoneDayDifference('2026-12-20T15:30:00Z', 'Europe/Berlin', 'Asia/Tokyo')).toBe(1);
  expect(zoneDayDifference('2026-12-20T12:00:00Z', 'Pacific/Honolulu', 'Pacific/Kiritimati')).toBe(1);
});
it('uses the selected dates DST rules and normalizes a missing spring-forward time', () => {
  const winter = zonedToUtc({ date: '2026-01-15', time: '12:00' }, 'Europe/Berlin');
  const summer = zonedToUtc({ date: '2026-07-15', time: '12:00' }, 'Europe/Berlin');
  expect(utcToZoned(winter.iso, 'Asia/Tokyo').time).toBe('20:00');
  expect(utcToZoned(summer.iso, 'Asia/Tokyo').time).toBe('19:00');
  const spring = zonedToUtc({ date: '2026-03-29', time: '02:30' }, 'Europe/Berlin');
  expect(spring.shifted).toBe(true);
  expect(utcToZoned(spring.iso, 'Europe/Berlin').time).toBe('03:30');
  expect(isTimeZone('Asia/Tokyo')).toBe(true);
  expect(isTimeZone('Not/AZone')).toBe(false);
});
