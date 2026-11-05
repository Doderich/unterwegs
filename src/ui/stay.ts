import type { Lodging } from '@/api/schemas';
import { tr } from '@/i18n';
import { daysBetween, formatTime, localDate } from '@/time/tz';

import { lodgingLabel } from './icons';

/**
 * The stay summary for the night after `day`, distinguishing arrival, the nights in between and the departure:
 * "Check-in ab 15:00 · Hotel" / "Nacht 2 von 3 · Check-out morgen 10:00 · Hotel". In the lodging's own zone.
 */
export function staySubtitle(l: Lodging, day: string, collectionZone: string): string {
  const tz = l.timezone ?? collectionZone;
  const parts: string[] = [];
  const checkIn = l.check_in ? localDate(l.check_in, tz) : null;
  const checkOut = l.check_out ? localDate(l.check_out, tz) : null;
  if (l.check_in && checkIn === day) parts.push(tr('stay.checkinFromTime', { time: formatTime(l.check_in, tz) }));
  else if (checkIn && checkOut)
    parts.push(tr('stay.nightNOfTotal', { n: daysBetween(checkIn, day) + 1, total: daysBetween(checkIn, checkOut) }));
  if (l.check_out && checkOut && daysBetween(day, checkOut) === 1)
    parts.push(tr('stay.checkoutTomorrowTime', { time: formatTime(l.check_out, tz) }));
  parts.push(lodgingLabel(l.type));
  return parts.join(' · ');
}
