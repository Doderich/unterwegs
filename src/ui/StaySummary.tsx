import type { ReactElement } from 'react';

import type { Lodging } from '@/api/schemas';
import { tr } from '@/i18n';
import { lodgingZone, stayDates } from '@/time/ownZone';
import { formatDateTime, utcOffset } from '@/time/tz';

import { copyRow, infoRow, linkRows, mapsRow, type RowTheme, type useCopy } from './rows';

/** `1 Nacht` / `3 Nächte` */
export function nightsLabel(n: number): string {
  return tr('staySummary.nights', { count: n });
}

/**
 * What arriving at a lodging needs, in this order: check-in and check-out (with the nights) in the lodging's own
 * zone, the address with the maps action, the booking number to copy and the booking site. Native rows for a
 * FieldGroup section.
 */
export function stayRows(
  t: RowTheme,
  copier: ReturnType<typeof useCopy>,
  lodging: Lodging,
  collectionZone: string,
): ReactElement[] {
  const tz = lodgingZone(lodging, collectionZone);
  const stay = stayDates(lodging, collectionZone);
  const nights = stay.checkIn && stay.checkOut ? stay.nights : null;
  // Only when the lodging's zone isn't the collection's: otherwise every time would carry a redundant offset.
  const zoneNote = tz !== collectionZone && lodging.check_in ? ` (UTC${utcOffset(lodging.check_in, tz)})` : '';

  return [
    lodging.check_in
      ? infoRow(t, {
          key: 'check-in',
          icon: 'time',
          label: `${tr('common.checkin')}${zoneNote}`,
          value: formatDateTime(lodging.check_in, tz),
        })
      : null,
    lodging.check_out
      ? infoRow(t, {
          key: 'check-out',
          icon: 'time',
          label: nights ? `${tr('common.checkout')} · ${nightsLabel(nights)}` : tr('common.checkout'),
          value: formatDateTime(lodging.check_out, tz),
        })
      : null,
    mapsRow(t, {
      key: 'address',
      label: lodging.name,
      address: lodging.location,
      latitude: lodging.latitude,
      longitude: lodging.longitude,
    }),
    lodging.reservation_number
      ? copyRow(t, copier, { key: 'booking', label: tr('common.bookingNumber'), value: lodging.reservation_number })
      : null,
    ...(lodging.link ? linkRows(t, { label: tr('common.website'), url: lodging.link }) : []),
  ].filter((row): row is ReactElement => row !== null);
}
