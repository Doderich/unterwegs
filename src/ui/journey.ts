import type { Transportation } from '@/api/schemas';
import { tr } from '@/i18n';
import { daysBetween, formatDayLabel, formatDuration, formatTime, localDate, utcOffset, zoneLabel } from '@/time/tz';

/** One end of a journey, in that end's own zone. */
export type JourneyEnd = {
  /** `14:00`, or `–` without a time. */
  time: string;
  /** `Do., 17.12. · Deutschland, UTC+1`; null without a time. */
  context: string | null;
  /** `Frankfurt (FRA)` */
  place: string | null;
};

export type Journey = {
  from: JourneyEnd;
  to: JourneyEnd;
  /** Calendar days between departure and arrival, each in its own zone: `+1` on an overnight flight. */
  dayShift: number;
  /** `11 h 45 min`, or empty. */
  duration: string;
};

/**
 * Departure and arrival as the journey summary shows them. Each end uses its own zone (falling back to the
 * departure zone, then the collection's), never the phone's, so cross-midnight and cross-zone journeys read the
 * same wherever the phone is.
 */
export function journey(j: Transportation, collectionZone: string): Journey {
  const startTz = j.start_timezone ?? collectionZone;
  const endTz = j.end_timezone ?? startTz;
  const end = (iso: string | null | undefined, tz: string, place?: string | null, code?: string | null) => ({
    time: iso ? formatTime(iso, tz) : '–',
    context: iso ? `${formatDayLabel(localDate(iso, tz))} · ${zoneLabel(tz)}, UTC${utcOffset(iso, tz)}` : null,
    place: place ? (code ? `${place} (${code})` : place) : null,
  });
  return {
    from: end(j.date, startTz, j.from_location, j.start_code),
    to: end(j.end_date, endTz, j.to_location, j.end_code),
    dayShift: j.date && j.end_date ? daysBetween(localDate(j.date, startTz), localDate(j.end_date, endTz)) : 0,
    duration: formatDuration(j.travel_duration_minutes),
  };
}

/** `(+1 Tag)` after the arrival time, or nothing. */
export function dayShiftLabel(shift: number): string | null {
  return shift > 0 ? tr('journey.dayShift', { count: shift }) : null;
}
