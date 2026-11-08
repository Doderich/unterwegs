import { daysBetween, localDate } from './tz';

/**
 * Own time zone (GLOSSARY.md): every time is shown in the zone it belongs to, falling back to the collection time
 * zone only when the object has none. These are the fallback rules, in one place.
 */

type Stay = { timezone?: string | null; check_in?: string | null; check_out?: string | null };
type Leg = { start_timezone?: string | null; end_timezone?: string | null };

/** A lodging's zone (check-in and check-out), else the collection's. */
export const lodgingZone = (l: Pick<Stay, 'timezone'>, collectionZone: string): string => l.timezone ?? collectionZone;

/** A transportation's departure zone, else the collection's. */
export const departureZone = (t: Leg, collectionZone: string): string => t.start_timezone ?? collectionZone;

/** A transportation's arrival zone, else its departure zone, else the collection's. */
export const arrivalZone = (t: Leg, collectionZone: string): string =>
  t.end_timezone ?? departureZone(t, collectionZone);

export type StayDates = { checkIn: string | null; checkOut: string | null; nights: number };

/** Check-in and check-out as local dates (`YYYY-MM-DD`) in the lodging's own zone, and the nights between. */
export function stayDates(l: Stay, collectionZone: string): StayDates {
  const zone = lodgingZone(l, collectionZone);
  const checkIn = l.check_in ? localDate(l.check_in, zone) : null;
  const checkOut = l.check_out ? localDate(l.check_out, zone) : null;
  return { checkIn, checkOut, nights: checkIn && checkOut ? Math.max(0, daysBetween(checkIn, checkOut)) : 0 };
}

/** Night lodging: you sleep there the night after `date` (checked in on or before it, checked out after it). */
export function sleepsThere(stay: StayDates, date: string): boolean {
  return !!stay.checkIn && !!stay.checkOut && stay.checkIn <= date && date < stay.checkOut;
}
