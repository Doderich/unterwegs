import type { Collection } from '@/api/schemas';

import { lodgingZone, sleepsThere, stayDates } from './ownZone';
import { deviceTimeZone, localDate } from './tz';

/**
 * The collection's "home" zone, used to decide which day is today.
 * Most common lodging zone → arrival zone of transports → phone zone.
 */
export function collectionTimeZone(collection: Pick<Collection, 'lodging' | 'transportations'>): string {
  const counts = new Map<string, number>();
  const add = (tz: string | null | undefined, weight: number) => {
    if (tz) counts.set(tz, (counts.get(tz) ?? 0) + weight);
  };
  collection.lodging.forEach((l) => add(l.timezone, 10));
  collection.transportations.forEach((t) => add(t.end_timezone, 1));
  let best: string | null = null;
  let bestCount = 0;
  for (const [tz, n] of counts) {
    if (n > bestCount) {
      best = tz;
      bestCount = n;
    }
  }
  return best ?? deviceTimeZone();
}

/** Today's date (`YYYY-MM-DD`) in a zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return localDate(now, timeZone);
}

type NightLodging = { timezone?: string | null; check_in?: string | null; check_out?: string | null };

/**
 * Today's date and the zone it was decided in: the zone of tonight's lodging (checked in on or before
 * its local date, checked out after it), otherwise `fallbackZone`.
 */
export function todayFor(
  lodging: readonly NightLodging[],
  fallbackZone: string,
  now: Date = new Date(),
): { date: string; timeZone: string } {
  for (const l of lodging) {
    const zone = lodgingZone(l, fallbackZone);
    const date = localDate(now, zone);
    if (sleepsThere(stayDates(l, fallbackZone), date)) return { date, timeZone: zone };
  }
  return { date: todayIn(fallbackZone, now), timeZone: fallbackZone };
}

/**
 * Index of the day to open: today if it's a collection day; before the collection the first day;
 * after the collection the last day; on a gap the closest earlier day.
 */
export function initialDayIndex(sortedDates: string[], today: string): number {
  if (sortedDates.length === 0) return 0;
  if (today <= sortedDates[0]) return 0;
  let index = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (sortedDates[i] <= today) index = i;
  }
  return index;
}

export type CollectionPhase = 'upcoming' | 'current' | 'past';

export function collectionPhase(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  today: string,
): CollectionPhase | null {
  if (!startDate || !endDate) return null;
  if (today < startDate) return 'upcoming';
  if (today > endDate) return 'past';
  return 'current';
}
