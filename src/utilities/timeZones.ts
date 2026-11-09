import { localDate } from '@/time/tz';

export function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format(0);
    return true;
  } catch {
    return false;
  }
}
/** Compare calendar dates, not elapsed hours: midnight and DST are independent. */
export function zoneDayDifference(instant: string, home: string, away: string): number {
  return Math.round((Date.parse(localDate(instant, away)) - Date.parse(localDate(instant, home))) / 86400000);
}
